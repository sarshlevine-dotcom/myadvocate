import { HTMLAttributes, ReactNode } from 'react'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: string
  children: ReactNode
  /** Whether to show the left accent border (default: true) */
  bordered?: boolean
}

const variantConfig: Record<
  AlertVariant,
  { bg: string; border: string; title: string; icon: string }
> = {
  info: {
    bg: 'bg-blue-50',
    border: 'border-blue-400',
    title: 'text-blue-800',
    icon: 'ℹ️',
  },
  success: {
    bg: 'bg-green-50',
    border: 'border-green-400',
    title: 'text-green-800',
    icon: '✅',
  },
  warning: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-400',
    title: 'text-yellow-800',
    icon: '⚠️',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-400',
    title: 'text-red-800',
    icon: '❌',
  },
}

/**
 * Alert — inline status or notification message
 *
 * Usage:
 *   <Alert variant="success" title="Appeal letter ready">
 *     Your letter has been generated and is ready for download.
 *   </Alert>
 *
 *   <Alert variant="error">
 *     Something went wrong. Please try again.
 *   </Alert>
 *
 *   <Alert variant="warning" title="Important">
 *     You have 29 days left to appeal this denial.
 *   </Alert>
 */
export function Alert({
  variant = 'info',
  title,
  children,
  bordered = true,
  className = '',
  role = 'alert',
  ...props
}: AlertProps) {
  const config = variantConfig[variant]

  return (
    <div
      role={role}
      className={[
        'rounded-lg p-4',
        config.bg,
        bordered ? `border-l-4 ${config.border}` : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {title && (
        <p className={['flex items-center gap-1.5 font-semibold text-sm mb-1', config.title].join(' ')}>
          <span aria-hidden="true">{config.icon}</span>
          {title}
        </p>
      )}
      <div className="text-sm text-gray-700">{children}</div>
    </div>
  )
}
