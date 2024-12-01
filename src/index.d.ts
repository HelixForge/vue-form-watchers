declare module "vue-form-watchers" {
    /**
     * Dynamically create debounced watchers for reactive form fields.
     * @param formObject - The reactive form object.
     * @param updateFunction - Callback triggered on field changes (key, value).
     * @param options - Options for customization.
     */
    export function createFormWatchers(
        formObject: Record<string, any>,
        updateFunction: (key: string, value: any) => void,
        options?: {
            debounceTime?: number;
            immediate?: boolean;
        }
    ): void;
}

declare module "vue-form-watchers" {
    /**
     * Dynamically create debounced watchers for reactive form fields.
     * @param formObject - The reactive form object.
     * @param updateFunction - Callback triggered on field changes (key, value).
     * @param options - Options for customization.
     */
    export default function createFormWatchers(
        formObject: Record<string, any>,
        updateFunction: (key: string, value: any) => void,
        options?: {
            debounceTime?: number;
            immediate?: boolean;
        }
    ): void;
}