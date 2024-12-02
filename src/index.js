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
        updateFunctionDebounced,
        skipExternalUpdates,
        isExternalUpdate,
        isExternalUpdateFlag,
        immediate,
        logger
    }
) {
    return watch(
        () => formObject[key],
        (newValue, oldValue) => {
            if (newValue === oldValue) return;

            const updateSource = typeof isExternalUpdate === 'function'
                ? (isExternalUpdate(key, newValue, oldValue) ? 'external' : 'user')
                : (isExternalUpdateFlag ? 'external' : 'user');

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
    createWatcherConfig
) {
    return watch(formObject, (newVal, oldVal) => {
        const newKeys = Object.keys(newVal);
        const oldKeys = oldVal ? Object.keys(oldVal) : [];

        const addedKeys = newKeys.filter(key => !oldKeys.includes(key));

        if (addedKeys.length > 0) {
            createWatcherConfig.logger.newProperties(addedKeys);
            addedKeys.forEach(key => createFieldWatcher(formObject, key, createWatcherConfig));
        }
    }, {deep: true});
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

    const {
        debounceTime = 500,
        immediate = false,
        skipExternalUpdates = true,
        isExternalUpdate = null,
        debug = false
    } = options;
    console.log('debounceTime', debounceTime);
    console.log('debug', debug);
    let isExternalUpdateFlag = false;
    const logger = createLogger(debug);

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
        updateFunctionDebounced,
        skipExternalUpdates,
        isExternalUpdate,
        isExternalUpdateFlag,
        immediate,
        logger
    };


    // Create watchers for existing fields
    Object.keys(formObject).forEach(key =>
        createFieldWatcher(formObject, key, watcherConfig)
    );

    // Watch for new properties
    createObjectWatcher(formObject, watcherConfig);

    // Return external update control
    return {
        markUpdateAsExternal: (callback) => {
            isExternalUpdateFlag = true;
            try {
                callback();
            } finally {
                isExternalUpdateFlag = false;
            }
        }
    };
}

export default createFormWatchers;