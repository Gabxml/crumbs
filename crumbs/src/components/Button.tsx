import { Link } from 'react-router-dom'
import type { ComponentPropsWithoutRef, ReactNode } from 'react'
import { focusRing, pressable } from '../lib/ui'

// Three fills, no gradients and no shadows: primary is the accent, secondary is
// the subtle fill, tertiary is text alone. The two outlines are the same idea for
// the cases that need to be readable on a flat page without adding a filled block
// to it — secondary is too quiet against light grey, so the edge is what carries
// the button, and the destructive one borrows the danger colour for both.
const variantClass = {
  primary: 'bg-accent text-on-accent hover:bg-accent-press',
  secondary: 'bg-fill text-text-h hover:brightness-[0.97]',
  tertiary: 'text-accent hover:bg-accent-tint',
  danger: 'bg-fill text-danger hover:brightness-[0.97]',
  outline: 'border border-inactive text-text-h hover:border-text-h hover:bg-fill',
  'outline-danger': 'border border-danger text-danger hover:bg-danger/10',
} as const

const sizeClass = {
  md: 'px-4 py-2.5 text-[15px]',
  sm: 'px-3 py-1.5 text-[13px]',
} as const

const base =
  'inline-flex select-none items-center justify-center gap-2 rounded-control font-medium disabled:pointer-events-none disabled:opacity-40'

export type ButtonVariant = keyof typeof variantClass

function classes(variant: ButtonVariant, size: keyof typeof sizeClass, className?: string) {
  return `${base} ${variantClass[variant]} ${sizeClass[size]} ${focusRing} ${pressable} ${className ?? ''}`
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: {
  variant?: ButtonVariant
  size?: keyof typeof sizeClass
  className?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'className'>) {
  return (
    <button className={classes(variant, size, className)} {...props}>
      {children}
    </button>
  )
}

/**
 * The same three treatments, for something that navigates rather than acts.
 * Kept separate from Button rather than reached for with a polymorphic `as`, so
 * that `to` stays type-checked.
 */
export function ButtonLink({
  variant = 'tertiary',
  size = 'md',
  className,
  children,
  ...props
}: {
  variant?: ButtonVariant
  size?: keyof typeof sizeClass
  className?: string
  children?: ReactNode
} & Omit<ComponentPropsWithoutRef<typeof Link>, 'className'>) {
  return (
    <Link className={classes(variant, size, className)} {...props}>
      {children}
    </Link>
  )
}

/**
 * A round icon-only button. Circles rather than squircles, because at this size
 * the distinction is invisible and a circle is the shape the platform uses.
 */
export function IconButton({
  label,
  variant = 'secondary',
  className,
  children,
  ...props
}: {
  label: string
  variant?: 'secondary' | 'primary' | 'plain'
  className?: string
} & Omit<ComponentPropsWithoutRef<'button'>, 'className'>) {
  const fill =
    variant === 'primary'
      ? 'bg-accent text-on-accent hover:bg-accent-press'
      : variant === 'plain'
        ? 'text-text-h hover:bg-fill'
        : 'bg-fill text-text-h hover:brightness-[0.97]'

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-10 shrink-0 place-items-center rounded-full ${fill} ${focusRing} ${pressable} ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  )
}
