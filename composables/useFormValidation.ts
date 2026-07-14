interface ValidationRule {
  required?: boolean
  minLength?: number
  pattern?: RegExp
  message?: string
}

type StringKeyOf<T> = Extract<keyof T, string>
type ValidationErrors<T> = Partial<Record<StringKeyOf<T>, string>>

export const useFormValidation = <T extends object>(rules: Partial<Record<StringKeyOf<T>, ValidationRule>>) => {
  const errors = reactive({}) as ValidationErrors<T>

  const clearError = (field: StringKeyOf<T>) => {
    delete errors[field]
  }

  const clearErrors = () => {
    for (const field of Object.keys(errors) as StringKeyOf<T>[]) {
      delete errors[field]
    }
  }

  const validate = (form: T) => {
    clearErrors()

    for (const field of Object.keys(rules) as StringKeyOf<T>[]) {
      const rule = rules[field]
      if (!rule) continue

      const value = form[field] as unknown
      const text = typeof value === 'string' ? value.trim() : value

      if (rule.required && (text === '' || text == null)) {
        errors[field] = rule.message ?? 'This field is required.'
        continue
      }

      if (rule.minLength && typeof text === 'string' && text.length < rule.minLength) {
        errors[field] = rule.message ?? `Please enter at least ${rule.minLength} characters.`
        continue
      }

      if (rule.pattern && typeof text === 'string' && text && !rule.pattern.test(text)) {
        errors[field] = rule.message ?? 'Please use a valid format.'
      }
    }

    return Object.keys(errors).length === 0
  }

  return {
    errors,
    clearError,
    clearErrors,
    validate
  }
}
