import { useId } from 'react'
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'

const fieldControl =
  'w-full rounded-control bg-fill px-4 py-2.5 text-[15px] text-text-h placeholder:text-inactive outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-40'

// The union of what an input and a textarea accept, minus the keys that mean
// something different on each. `as` then picks the element and the rest of the
// props follow it.
type FieldControlProps = Omit<ComponentPropsWithoutRef<'input'>, 'className' | 'aria-describedby'> &
  Omit<Partial<ComponentPropsWithoutRef<'textarea'>>, 'type' | 'size' | 'className'>

/**
 * A labelled control. The label, the hint and the error are wired together here
 * rather than at each call site, so a field cannot end up with a message that
 * assistive technology has no way to associate with its input.
 *
 * `as` switches between an input and a textarea; both take the same props and
 * get the same treatment.
 */
export default function Field({
  label,
  hint,
  error,
  as,
  className,
  controlClassName,
  ...props
}: {
  label: string
  hint?: string
  error?: string
  as?: 'input' | 'textarea'
  className?: string
  controlClassName?: string
} & FieldControlProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const shared = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
  }

  const control =
    as === 'textarea' ? (
      <textarea
        {...shared}
        className={`${fieldControl} resize-y ${controlClassName ?? ''}`}
        {...props}
      />
    ) : (
      <input
        {...shared}
        className={`${fieldControl} ${controlClassName ?? ''}`}
        {...props}
      />
    )

  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <label htmlFor={id} className="text-[13px] font-medium text-text-h">
        {label}
      </label>

      {control}

      {hint && (
        <p id={hintId} className="text-[13px] text-text">
          {hint}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/** The read-only counterpart, for values that are shown but not edited. */
export function FieldValue({ label, children }: { label: string; children: ReactNode }) {
  const Component: ElementType = 'div'

  return (
    <Component className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-text-h">{label}</span>
      <div className="rounded-control bg-fill px-4 py-2.5 text-[15px] text-text-h">
        {children}
      </div>
    </Component>
  )
}
