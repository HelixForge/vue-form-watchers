import { watch } from 'vue';

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
