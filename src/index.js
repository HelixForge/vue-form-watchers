import {watch} from "vue";

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 */
function createDebouncer(func, wait = 0) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), wait);
    };
}

/**
 * Logger utility for debugging form watcher events
 */
const createLogger = (debug = false) => ({
    valueChange: (key, {oldValue, newValue, source}) => {
        if (debug) {
            console.log(`Value changed for ${key}:`, {
                from: oldValue,
                to: newValue,
                source
            });
        }
    },
    skippedUpdate: (key) => {
        if (debug) {
            console.log('Skipping external update for:', key);
        }
    },
    debouncedUpdate: (key, value, source) => {
        if (debug) {
            console.log('Debounced update for:', key, value, 'from:', source);
        }
    },
    newProperties: (keys) => {
        if (debug) {
            console.log('New properties detected:', keys);
        }
    }
});

/**
 * Creates and manages a single field watcher
 */
function createFieldWatcher(
    formObject,
    key,
    {
        immediate,
        updateFunctionDebounced,
        skipExternalUpdates,
        isExternalUpdate,
        getIsExternalUpdateFlag,
        logger,
        exclude
    }
) {
    if (exclude.includes(key)) {
        logger.skippedUpdate(key, 'Field is excluded');
        return;
    }

    return watch(
        () => formObject[key],
        (newValue, oldValue) => {
            if (newValue === oldValue) return;

            // Check external update flag before custom logic
            let updateSource = 'user';
            if (getIsExternalUpdateFlag()) {
                updateSource = 'external';
            } else if (typeof isExternalUpdate === 'function' && isExternalUpdate(key, newValue, oldValue)) {
                updateSource = 'external';
            }

            logger.valueChange(key, {oldValue, newValue, source: updateSource});

            if (skipExternalUpdates && updateSource === 'external') {
                logger.skippedUpdate(key);
                return;
            }
            updateFunctionDebounced(key, newValue, updateSource);
        },
        {deep: true, immediate}
    );
}


/**
 * Watches for new properties added to the form object
 */
function createObjectWatcher(
    formObject,
    config
) {
    const watchers = new Map();

    const updateWatchers = (keys) => {
        keys.forEach(key => {
            if (!watchers.has(key)) {
                const watcher = createFieldWatcher(formObject, key, config);
                if (watcher) watchers.set(key, watcher);
            }
        });
    };

    updateWatchers(Object.keys(formObject));





    return watch(
        () => Object.keys(formObject),
        (newKeys, oldKeys = []) => {
            const addedKeys = newKeys.filter(key => !oldKeys.includes(key));
            if (addedKeys.length > 0) {
                config.logger.newProperties(addedKeys);
                updateWatchers(addedKeys);
            }
        },
        {immediate: true, deep: true}
    );
}


/**
 * Main function to create form watchers
 */
export function createFormWatchers(formObject, updateFunction, options = {}) {
    // Validate inputs
    if (!formObject || typeof formObject !== 'object') {
        throw new Error('formObject must be a reactive object');
    }
    if (typeof updateFunction !== 'function') {
        throw new Error('updateFunction must be a function');
    }
    if (options.exclude !== undefined && !Array.isArray(options.exclude)) {
        throw new Error('exclude option must be an array');
    }

    const {
        debounceTime = 500,
        immediate = false,
        skipExternalUpdates = true,
        isExternalUpdate = null,
        debug = false,
        exclude = []
    } = options;


    let isExternalUpdateFlag = false;

    const getIsExternalUpdateFlag = () => isExternalUpdateFlag;
    const logger = createLogger(debug)

    // Create debounced update function
    const updateFunctionDebounced = createDebouncer(
        (key, value, source) => {
            logger.debouncedUpdate(key, value, source);
            updateFunction(key, value, source);
        },
        debounceTime
    );

    // Common configuration for watchers
    const watcherConfig = {
        immediate,
        updateFunctionDebounced,
        skipExternalUpdates,
        isExternalUpdate,
        getIsExternalUpdateFlag,
        logger,
        exclude
    };

    // Store all watchers so we can clean them up later
    const watchers = new Set();

    // Modify createFieldWatcher to store the watcher
    const createAndTrackFieldWatcher = (key) => {
        const watcher = createFieldWatcher(formObject, key, watcherConfig);
        if (watcher) watchers.add(watcher);
        return watcher;
    };

    // Create watchers for existing fields
    Object.keys(formObject).forEach(createAndTrackFieldWatcher);


    // Watch for new properties
    const objectWatcher = createObjectWatcher(formObject, {
        ...watcherConfig,
        createFieldWatcher: createAndTrackFieldWatcher
    });
    watchers.add(objectWatcher);

    // Return external update control
    return {
        markUpdateAsExternal: (callback) => {
            isExternalUpdateFlag = true;
            try {
                callback();
                Promise.resolve().then(() => {
                    isExternalUpdateFlag = false;
                });
            } catch (e) {
                isExternalUpdateFlag = false;
                throw e;
        }
    },
        destroy: () => {
            // Stop all watchers
            watchers.forEach(unwatch => unwatch());
            watchers.clear();
        }

    };
}

export default createFormWatchers;