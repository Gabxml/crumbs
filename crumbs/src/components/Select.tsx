import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from '@untitledui/icons/ChevronDown'

/**
 * A select with its own chevron.
 *
 * The browser's is the reason this exists. It is drawn hard against the right
 * edge of the field with a padding the page cannot reach, so the only way to
 * space it is to give up on it: `appearance-none` takes it away and this puts
 * one back at a fixed inset, in the surrounding text colour, the same size at
 * every width and in both themes.
 *
 * `className` sizes the *wrapper*, and the select fills it — so a full-width
 * select is `className="w-full"` and a pill is left to shrink.
 */
export default function Select({
  className,
  children,
  ...props
}: { className?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative inline-grid ${className ?? ''}`}>
      <select
        {...props}
        className="w-full appearance-none rounded-full bg-fill py-2 pr-10 pl-4 text-[14px] text-text-h outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        strokeWidth={1.75}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-text"
      />
    </span>
  )
}