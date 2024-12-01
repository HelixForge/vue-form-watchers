import { watch } from 'vue';

/**
 * Dynamically create debounced watchers for form fields.
 * @param {Object} formObject - The reactive form object.
 * @param {Function} updateFunction - Callback for updates (key, value).
 * @param {Object} options - Optional settings { debounceTime, immediate }.
 */
export function createFormWatchers(formObject, updateFunction, options = {}) {
    const { debounceTime = 500, immediate = false } = options;

    function debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    }

    const updateFunctionDebounced = debounce((key, value) => {
        updateFunction(key, value);
    }, debounceTime);

    Object.keys(formObject).forEach((key) => {
        watch(
            () => formObject[key],
            (newValue, oldValue) => {
                if (newValue !== oldValue) {
                    updateFunctionDebounced(key, newValue);
                }
            },
            { immediate }
        );
    });
}
