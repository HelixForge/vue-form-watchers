# vue-form-watchers

A lightweight utility for Vue 3 that creates dynamic, debounced watchers for reactive form fields. This package helps
you efficiently manage form state changes and synchronization with minimal boilerplate code.

## Features

- 🔄 Automatic watcher creation for all form fields
- ⚡ Debounced updates to prevent excessive callbacks
- 🔍 Dynamic detection of new form properties
- 🎯 Selective handling of external vs. user updates
- 📦 TypeScript support
- 🪶 Zero dependencies (except Vue 3)

## Installation

```bash
npm install vue-form-watchers
```

## Usage

### Basic Usage

```javascript
import {ref, onUnmounted} from 'vue'
import {createFormWatchers} from 'vue-form-watchers'

export default {
    setup() {
        const form = ref({
            name: '',
            email: '',
            age: 0
        })

        // Store the destroy function for cleanup
        const {destroy} = createFormWatchers(form.value, (key, value, source) => {
            console.log(`${key} changed to ${value} (${source})`)
            // Perform validation, API calls, or other operations
        })

        // Clean up watchers when component unmounts
        onUnmounted(() => {
            destroy()
        })

        return {form}
    }
}
```

### Advanced Configuration

```javascript
const {markUpdateAsExternal, destroy} = createFormWatchers(
    form.value,
    (key, value, source) => {
        if (source === 'user') {
            // Handle user-initiated changes
            validateField(key, value)
        }
    },
    {
        debounceTime: 300,              // Customize debounce delay (default: 500ms)
        immediate: true,                // Trigger on initialization (default: false)
        skipExternalUpdates: true,      // Ignore programmatic updates (default: true)
        debug: true,                    // Enable detailed logging (default: false)
        exclude: ['tempField'],         // Fields to ignore
        isExternalUpdate: (key, newValue, oldValue) => {
            // Custom logic to identify external updates
            return newValue === oldValue
        }
    }
)
```

### Real-time Form Validation With API Integration

```javascript
import {ref, onUnmounted} from 'vue'
import {createFormWatchers} from 'vue-form-watchers'

export default {
    setup() {
        // Form state
        const form = ref({
            email: '',
            password: '',
            tempData: ''  // This field won't trigger validation
        })

        // Validation state
        const errors = ref({})
        const isValidating = ref(false)

        // Create watchers with validation
        const {markUpdateAsExternal, destroy} = createFormWatchers(
            form.value,
            async (key, value) => {
                isValidating.value = true

                try {
                    // Example validation rules
                    switch (key) {
                        case 'email':
                            await api.validateEmail(value)  // Check email format & uniqueness
                            break
                        case 'password':
                            await api.validatePassword(value)  // Check password strength
                            break
                    }

                    // Clear error when validation passes
                    errors.value[key] = null

                } catch (error) {
                    // Store validation error message
                    errors.value[key] = error.message
                } finally {
                    isValidating.value = false
                }
            },
            {
                debounceTime: 500,      // Wait 500ms after typing
                exclude: ['tempData']   // Don't validate this field
            }
        )

        // Load saved form data
        const loadSavedData = async () => {
            try {
                const savedData = await api.getSavedForm()

                // Use markUpdateAsExternal to prevent validation
                // when loading saved data
                markUpdateAsExternal(() => {
                    Object.assign(form.value, savedData)
                })
            } catch (error) {
                console.error('Failed to load saved data:', error)
            }
        }

        // Clean up
        onUnmounted(() => {
            destroy()
        })

        // Template usage
        return {
            form,
            errors,
            isValidating,
            loadSavedData
        }
    }
}
````

## API Reference

### createFormWatchers

```typescript
const {markUpdateAsExternal, destroy} = createFormWatchers(
    form.value,
    (key, value, source) => {
        console.log(`Field ${key} changed to ${value} from ${source}`)
    },
    {
        debounceTime: 300,              // Debounce delay (default: 500ms)
        immediate: true,                // Trigger on initialization (default: false)
        skipExternalUpdates: true,      // Ignore programmatic updates (default: true)
        debug: true,                    // Enable detailed logging (default: false)
        exclude: ['tempField'],         // Fields to ignore
        isExternalUpdate: (key, newValue, oldValue) => {
            // Custom logic to identify external updates
            return someCondition
        }
    }
)
```

#### Parameters

- `formObject`: The reactive form object to watch
- `updateFunction`: Callback function triggered on field changes
- `options`: Configuration options object

#### Returns

- `markUpdateAsExternal`: Wrap form updates to prevent triggering watchers
- `destroy`: Clean up watchers and event listeners

An object containing the `markUpdateAsExternal` utility function for handling programmatic updates.

#### Debug Logging

When debug: true is set, the following events will be logged to the console:

- Value changes for each field (old value, new value, and source)
- Skipped external updates
- Debounced update calls
- Detection of new properties added to the form

This is useful for debugging and understanding the behavior of your form watchers during development.

## Examples

### Form Validation

```javascript
import {ref} from 'vue'
import {createFormWatchers} from 'vue-form-watchers'

const form = ref({
    email: '',
    password: ''
})

const errors = ref({})


createFormWatchers(form.value, async (key, value) => {
    try {
        await validateField(key, value)
        errors.value[key] = null
    } catch (error) {
        errors.value[key] = error.message
    }
}, {
    debounceTime: 300,
    debug: process.env.NODE_ENV === 'development' // Enable debug logging in development
})
```

### API Synchronization

```javascript
import {ref} from 'vue'
import {createFormWatchers} from 'vue-form-watchers'

const form = ref({
    title: '',
    content: ''
})

const {markUpdateAsExternal} = createFormWatchers(
    form.value,
    async (key, value) => {
        await api.updateDraft({[key]: value})
    },
    {
        debounceTime: 1000,
        debug: process.env.NODE_ENV !== 'production' // Enable debug logging outside production
    }
)
// Load initial data
const loadDraft = async () => {
    const draft = await api.getDraft()
    markUpdateAsExternal(() => {
        form.value.title = draft.title
        form.value.content = draft.content
    })
}
```

## Error Handling

The createFormWatchers function includes error validation to ensure correct usage. Below are common errors that might be
thrown and how to handle them:

### Common Errors

- Invalid formObject
    - Error: `formObject must be a reactive object`
    - Cause: The first parameter must be a Vue reactive object (e.g., created with ref or reactive).
    - Solution: Ensure you pass a properly initialized reactive object.

```javascript
import {reactive} from 'vue';

const form = reactive({name: '', email: ''});
createFormWatchers(form, updateFunction);
```

- Invalid updateFunction
    - Error: `updateFunction must be a function`
    - Cause: The second parameter must be a function that accepts three arguments (key, value, source).
    - Solution: Pass a valid function that processes field updates.

```javascript
createFormWatchers(form, (key, value) => {
    console.log(`${key} changed to ${value}`);
});
```

- Invalid exclude Option
    - Error: `exclude must be an array of strings`
    - Cause: The second parameter must be a valid callback function to handle updates.
    - Solution: Pass a valid function that processes field updates.

```javascript
createFormWatchers(form, updateFunction, { exclude: ['tempField'] });
```

### Best Practices for Error Prevention
- Reactive Sources: Always use reactive objects  `ref`, `reactive`, or Pinia's reactive state(`this.$state`) as the 
`formObject` to ensure compatibility
- Custom Logic Validation: Validate custom logic for `isExternalUpdate` to ensure proper function definitions and avoid unintended behavior.
- Type Safety: Use TypeScript to leverage type-checking for configuration options and ensure consistent implementation.
- State Management: When working with Pinia, initialize watchers in the appropriate lifecycle methods (e.g.,` onMounted`) and clean them up (e.g., onUnmounted) to avoid memory leaks.

## Requirements

- Vue 3.0 or higher
- Node.js 14.16 or higher

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request