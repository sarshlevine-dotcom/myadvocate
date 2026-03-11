import { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Adds an extra padded section at the bottom — good for action buttons */
  footer?: ReactNode
  /** Removes default padding — useful when using CardHeader/CardBody sub-components */
  noPadding?: boolean
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

/**
 * Card — container with border, shadow, and rounded corners
 *
 * Usage:
 *   <Card>Simple content</Card>
 *
 *   <Card footer={<Button>Submit</Button>}>
 *     <CardHeader><h2>Title</h2></CardHeader>
 *     <CardBody>Body content</CardBody>
 *   </Card>
 *
 *   <Card noPadding>
 *     <CardHeader>Title</CardHeader>
 *     <CardBody>Content without uniform padding</CardBody>
 *   </Card>
 */
export function Card({ children, footer, noPadding = false, className = '', ...props }: CardProps) {
  return (
    <div
      className={[
        'rounded-xl border border-gray-200 bg-white shadow-sm',
        !noPadding && !footer ? 'p-6' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...props}
    >
      {noPadding || footer ? (
        <>
          <div>{children}</div>
          {footer && (
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 rounded-b-xl">
              {footer}
            </div>
          )}
        </>
      ) : (
        children
      )}
    </div>
  )
}

export function CardHeader({ children, className = '', ...props }: CardHeaderProps) {
  return (
    <div
      className={['px-6 py-4 border-b border-gray-100', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return (
    <div className={['px-6 py-5', className].filter(Boolean).join(' ')} {...props}>
      {children}
    </div>
  )
}
