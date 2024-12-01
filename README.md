# vue-form-watchers

A lightweight utility for Vue 3 that creates dynamic, debounced watchers for reactive form fields. This package helps you efficiently manage form state changes and synchronization with minimal boilerplate code.

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
import { ref } from 'vue'
import { createFormWatchers } from 'vue-form-watchers'

export default {
  setup() {
    const form = ref({
      name: '',
      email: '',
      age: 0
    })

    createFormWatchers(
      form.value,
      (key, value) => {
        console.log(`Field ${key} updated to:`, value)
        // Handle the update (e.g., API calls, validation)
      }
    )

    return { form }
  }
}
```

### Advanced Configuration

```javascript
import { ref } from 'vue'
import { createFormWatchers } from 'vue-form-watchers'

export default {
  setup() {
    const form = ref({
      username: '',
      email: ''
    })

    const { markUpdateAsExternal } = createFormWatchers(
      form.value,
      (key, value, source) => {
        console.log(`${key} updated to ${value} (${source})`)
      },
      {
        debounceTime: 300,           // Default: 500ms
        immediate: true,             // Default: false
        skipExternalUpdates: true,   // Default: true
        isExternalUpdate: (key, newValue, oldValue) => {
          // Custom logic to determine if update is external
          return false
        }
      }
    )

    // Use markUpdateAsExternal for programmatic updates
    const updateFormFromAPI = (data) => {
      markUpdateAsExternal(() => {
        form.value.username = data.username
        form.value.email = data.email
      })
    }

    return { form, updateFormFromAPI }
  }
}
```

## API Reference

### createFormWatchers

```typescript
function createFormWatchers(
  formObject: Record<string, any>,
  updateFunction: (key: string, value: any, source?: 'user' | 'external') => void,
  options?: {
    debounceTime?: number;      // Debounce delay in milliseconds
    immediate?: boolean;        // Trigger watchers immediately
    skipExternalUpdates?: boolean; // Skip callback for external updates
    isExternalUpdate?: (key: string, newValue: any, oldValue: any) => boolean;
  }
): {
  markUpdateAsExternal: (callback: () => void) => void;
}
```

#### Parameters

- `formObject`: The reactive form object to watch
- `updateFunction`: Callback function triggered on field changes
- `options`: Configuration options object

#### Returns

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
import { ref } from 'vue'
import { createFormWatchers } from 'vue-form-watchers'

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
import { ref } from 'vue'
import { createFormWatchers } from 'vue-form-watchers'

const form = ref({
  title: '',
  content: ''
})

const { markUpdateAsExternal } = createFormWatchers(
    form.value,
    async (key, value) => {
        await api.updateDraft({ [key]: value })
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