import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
}

/**
 * Input — standard text input with optional error state
 *
 * Usage:
 *   <Input placeholder="Enter denial code" />
 *   <Input type="email" error="Invalid email address" />
 *
 * Typically used inside <FormField> for label + error handling.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, className = '', ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={[
        'w-full rounded-lg border px-4 py-3 text-base',
        'bg-white text-gray-900 placeholder-gray-400',
        'transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
        error
          ? 'border-red-500 focus:ring-red-400'
          : 'border-gray-300 hover:border-gray-400',
        'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-invalid={error ? 'true' : undefined}
      {...props}
    />
  )
})
