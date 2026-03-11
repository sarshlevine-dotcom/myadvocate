import Link from 'next/link'
import { ReactNode } from 'react'

interface NavProps {
  /** Optional slot for auth controls (sign in / user menu) */
  actions?: ReactNode
}

interface NavLinkProps {
  href: string
  children: ReactNode
  /** Highlighted when the current path matches */
  active?: boolean
  external?: boolean
}

/**
 * Nav — top navigation bar
 *
 * Usage (in layout.tsx):
 *   <Nav
 *     actions={
 *       user
 *         ? <UserMenu email={user.email} />
 *         : <Link href="/auth">Sign in</Link>
 *     }
 *   />
 *
 * The logo and primary links are pre-configured for MyAdvocate.
 * To add a new top-level link, add a <NavLink> inside the nav items section.
 */
export function Nav({ actions }: NavProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <nav className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-bold text-lg text-blue-600 shrink-0"
        >
          <span aria-hidden="true">🛡️</span>
          MyAdvocate
        </Link>

        {/* Primary links */}
        <div className="hidden sm:flex items-center gap-1">
          <NavLink href="/tools/denial-decoder">Denial Decoder</NavLink>
          <NavLink href="/resources">Resources</NavLink>
          <NavLink href="/denial-codes">Denial Codes</NavLink>
        </div>

        {/* Auth / actions slot */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0 text-sm">
            {actions}
          </div>
        )}
      </nav>
    </header>
  )
}

/**
 * NavLink — individual navigation link
 *
 * Usage:
 *   <NavLink href="/tools/denial-decoder" active>Denial Decoder</NavLink>
 */
export function NavLink({ href, children, active = false, external = false }: NavLinkProps) {
  const externalProps = external
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {}

  return (
    <Link
      href={href}
      className={[
        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150',
        active
          ? 'bg-blue-50 text-blue-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
      ].join(' ')}
      {...externalProps}
    >
      {children}
    </Link>
  )
}

/**
 * PageHeader — top-of-page title + optional description
 *
 * Usage:
 *   <PageHeader
 *     title="Denial Code Decoder"
 *     description="Enter your denial code to understand what it means."
 *   />
 */
interface PageHeaderProps {
  title: string
  description?: string
  className?: string
}

export function PageHeader({ title, description, className = '' }: PageHeaderProps) {
  return (
    <div className={['mb-8', className].filter(Boolean).join(' ')}>
      <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
      {description && (
        <p className="mt-2 text-lg text-gray-600">{description}</p>
      )}
    </div>
  )
}
