import {watch} from "vue";

function createDebouncer(func, wait = 0) {
    let timeoutId;
    const debounced = (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), wait);
    };
    debounced.cancel = () => clearTimeout(timeoutId);
    return debounced;
}

const createLogger = (debug = false) => ({
    valueChange: (key, {oldValue, newValue, source}) => {
        if (debug) console.log(`Value changed for ${key}:`, {from: oldValue, to: newValue, source});
    },
    skippedUpdate: (key) => {
        if (debug) console.log('Skipping external update for:', key);
    },
    debouncedUpdate: (key, value, source) => {
        if (debug) console.log('Debounced update for:', key, value, 'from:', source);
    },
    newProperties: (keys) => {
        if (debug) console.log('New properties detected:', keys);
    },
    destroy: () => {
        if (debug) console.log('Destroying form watchers');
    }
});



function createFieldWatcher(
    formObject,
    key,
    watchers,
    config
) {
    if (config.exclude.includes(key)) {
        config.logger.skippedUpdate(key, 'Field is excluded');
        return null;
    }

    const watcher = watch(
        () => formObject[key],
        (newValue, oldValue) => {
            if (newValue === oldValue || config.isDestroyed.value) return;

            let updateSource = 'user';
            if (config.getIsExternalUpdateFlag()) {
                updateSource = 'external';
            } else if (typeof config.isExternalUpdate === 'function' && config.isExternalUpdate(key, newValue, oldValue)) {
                updateSource = 'external';
            }

            config.logger.valueChange(key, {oldValue, newValue, source: updateSource});

            if (config.skipExternalUpdates && updateSource === 'external') {
                config.logger.skippedUpdate(key);
                return;
            }

            if (!config.isDestroyed.value) {
                config.updateFunctionDebounced(key, newValue, updateSource);
            }
        },
        {deep: true, immediate: config.immediate}
    );

    watchers.add(watcher);
    return watcher;
}

function createObjectWatcher(
    formObject,
    watchers,
    config
) {
    const createWatcher = (key) => {
        if (!config.isDestroyed.value) {
            return createFieldWatcher(formObject, key, watchers, config);
        }
    };

    Object.keys(formObject).forEach(createWatcher);

    return watch(
        () => Object.keys(formObject),
        (newKeys, oldKeys = []) => {
            if (config.isDestroyed.value) return;
            const addedKeys = newKeys.filter(key => !oldKeys.includes(key));
            if (addedKeys.length > 0) {
                config.logger.newProperties(addedKeys);
                addedKeys.forEach(createWatcher);
            }
        },
        {immediate: true, deep: true}
    );
}

export function createFormWatchers(formObject, updateFunction, options = {}) {
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

    const isDestroyed = { value: false };
    let isExternalUpdateFlag = false;
    const watchers = new Set();
    const logger = createLogger(debug);

    const updateFunctionDebounced = createDebouncer(
        (key, value, source) => {
            if (!isDestroyed.value) {
                logger.debouncedUpdate(key, value, source);
                updateFunction(key, value, source);
            }
        },
        debounceTime
    );

    const config = {
        immediate,
        updateFunctionDebounced,
        skipExternalUpdates,
        isExternalUpdate,
        getIsExternalUpdateFlag: () => isExternalUpdateFlag,
        logger,
        exclude,
        isDestroyed
    };

    const objectWatcher = createObjectWatcher(formObject, watchers, config);
    watchers.add(objectWatcher);

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
            isDestroyed.value = true;
            logger.destroy();
            updateFunctionDebounced.cancel();
            watchers.forEach(unwatch => unwatch());
            watchers.clear();
        }
    };
}

export default createFormWatchers;