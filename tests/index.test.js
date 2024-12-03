import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {ref, nextTick} from 'vue'
import { createFormWatchers } from '../src/index'

describe('createFormWatchers', () => {
    let updateFn
    let form

    beforeEach(() => {
        vi.useFakeTimers()
        updateFn = vi.fn()
        form = ref({
            name: '',
            email: '',
            age: 0
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should watch form fields and trigger updates', async () => {
        createFormWatchers(form.value, updateFn, { debounceTime: 100 })

        form.value.name = 'John'
        await nextTick()
        vi.advanceTimersByTime(100)

        expect(updateFn).toHaveBeenCalledWith('name', 'John', 'user')
    })

    it('should respect excluded fields', async () => {
        createFormWatchers(form.value, updateFn, {
            debounceTime: 100,
            exclude: ['email']
        })

        form.value.name = 'John'
        form.value.email = 'john@example.com'
        await nextTick()
        vi.advanceTimersByTime(100)

        expect(updateFn).toHaveBeenCalledWith('name', 'John', 'user')
        expect(updateFn).not.toHaveBeenCalledWith('email', 'john@example.com', expect.any(String))
    })

    it('should handle external updates correctly', async () => {
        const { markUpdateAsExternal } = createFormWatchers(form.value, updateFn, {
            debounceTime: 100,
            skipExternalUpdates: true
        })

        markUpdateAsExternal(() => {
            form.value.name = 'John'
        })
        await nextTick()
        vi.advanceTimersByTime(100)

        expect(updateFn).not.toHaveBeenCalled()
    })

    it('should debounce updates correctly', async () => {
        createFormWatchers(form.value, updateFn, { debounceTime: 100 })

        form.value.name = 'J'
        await nextTick()
        vi.advanceTimersByTime(50)

        form.value.name = 'Jo'
        await nextTick()
        vi.advanceTimersByTime(50)

        form.value.name = 'John'
        await nextTick()
        vi.advanceTimersByTime(100)

        expect(updateFn).toHaveBeenCalledTimes(1)
        expect(updateFn).toHaveBeenCalledWith('name', 'John', 'user')
    })

    it('should handle immediate option with changes', async () => {
        form.value.name = 'John' // Set initial value
        await nextTick()

        createFormWatchers(form.value, updateFn, {
            debounceTime: 100,
            immediate: true
        })

        form.value.name = 'Jane' // Make a change
        await nextTick()
        vi.advanceTimersByTime(100)

        expect(updateFn).toHaveBeenCalledWith('name', 'Jane', 'user')
    })


    it('should handle custom isExternalUpdate function', async () => {
        createFormWatchers(form.value, updateFn, {
            debounceTime: 100,
            skipExternalUpdates: true,
            isExternalUpdate: (key, newValue) => newValue === 'EXTERNAL'
        })

        form.value.name = 'EXTERNAL'
        await nextTick()
        vi.advanceTimersByTime(100)

        form.value.name = 'USER'
        await nextTick()
        vi.advanceTimersByTime(100)

        expect(updateFn).toHaveBeenCalledTimes(1)
        expect(updateFn).toHaveBeenCalledWith('name', 'USER', 'user')
    })

    it('should throw error for invalid inputs', () => {
        expect(() => createFormWatchers(null, updateFn)).toThrow('formObject must be a reactive object')
        expect(() => createFormWatchers({}, null)).toThrow('updateFunction must be a function')
        expect(() => createFormWatchers(form.value, updateFn, { exclude: 'not-an-array' }))
            .toThrow('exclude option must be an array')
    })
})

describe('Form Watcher Cleanup', () => {
    let updateFn
    let form

    beforeEach(() => {
        vi.useFakeTimers()
        updateFn = vi.fn()
        form = ref({
            name: '',
            email: ''
        })
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('should properly clean up watchers on unmount', async () => {
        const cleanup = ref(null);
        const { destroy } = createFormWatchers(form.value, updateFn, { debounceTime: 100 });
        cleanup.value = destroy;

        // Test initial update
        form.value.name = 'test';
        await nextTick();
        vi.runAllTimers();

        // Cleanup
        cleanup.value();
        vi.clearAllTimers();

        // Verify no more updates
        updateFn.mockClear();
        form.value.name = 'test2';
        await nextTick();
        vi.runAllTimers();
        expect(updateFn).not.toHaveBeenCalled();
    });

    it('should handle errors in markUpdateAsExternal', async () => {
        const { markUpdateAsExternal } = createFormWatchers(form.value, updateFn);

        expect(() => markUpdateAsExternal(() => {
            throw new Error('test error');
        })).toThrow('test error');

        // Verify flag was reset
        form.value.name = 'test';
        await nextTick();
        vi.runAllTimers();
        expect(updateFn).toHaveBeenCalledWith('name', 'test', 'user');
    });

    it('should log debug messages when enabled', async () => {
        const spy = vi.spyOn(console, 'log');

        createFormWatchers(form.value, updateFn, { debug: true });

        form.value.name = 'test';
        await nextTick();
        vi.runAllTimers();

        expect(spy).toHaveBeenCalledWith('Value changed for name:', expect.any(Object));
        expect(spy).toHaveBeenCalledWith('Debounced update for:', 'name', 'test', 'from:', 'user');

        // Test skipped update
        const { markUpdateAsExternal } = createFormWatchers(form.value, updateFn, {
            debug: true,
            skipExternalUpdates: true
        });

        markUpdateAsExternal(() => {
            form.value.email = 'test@test.com';
        });
        await nextTick();
        vi.runAllTimers();

        expect(spy).toHaveBeenCalledWith('Skipping external update for:', 'email');

        // Test new properties
        form.value.newField = 'test';
        await nextTick();
        expect(spy).toHaveBeenCalledWith('New properties detected:', ['newField']);
    });

    it('should log debug message on destroy', async () => {
        const spy = vi.spyOn(console, 'log');
        const { destroy } = createFormWatchers(form.value, updateFn, { debug: true });

        destroy();

        expect(spy).toHaveBeenCalledWith('Destroying form watchers');
    });


});