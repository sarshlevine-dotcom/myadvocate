import { LabelHTMLAttributes, ReactNode } from 'react'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
  labelProps?: LabelHTMLAttributes<HTMLLabelElement>
}

/**
 * FormField — wraps a form control with label, hint text, and error message
 *
 * Usage:
 *   <FormField label="Denial Code" htmlFor="denial-code" error={errors.code}>
 *     <Input id="denial-code" {...register('code')} />
 *   </FormField>
 *
 *   <FormField label="State" hint="We use this to find relevant regulations." required>
 *     <select>...</select>
 *   </FormField>
 */
export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required = false,
  children,
  className = '',
  labelProps,
}: FormFieldProps) {
  return (
    <div className={['space-y-1.5', className].filter(Boolean).join(' ')}>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-800"
        {...labelProps}
      >
        {label}
        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}

      {hint && !error && (
        <p className="text-sm text-gray-500">{hint}</p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
