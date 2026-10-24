import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Plus } from '@untitledui/icons/Plus'
import { focusRing, pressable } from '../lib/ui'

// Pinned to the right rather than the left, because the left edge on a desktop
// is the rail, and your profile sits at the bottom of it — a left-hand button
// lands on top of that. The raised bottom offset on a phone keeps it clear of
// the floating tab bar, which is itself a row of buttons.
//
// A circle, not a squircle: a FAB is the one element that floats over the page,
// and the diffuse shadow is what separates it from whatever is behind it.
const ANCHOR =
  'pointer-events-none fixed right-5 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex flex-col items-end gap-3 lg:bottom-8 lg:right-8'

const ROUND =
  'pointer-events-auto grid place-items-center rounded-full shadow-float ' +
  'transition duration-200 ease-ios motion-reduce:transition-none'

/**
 * A floating action button, and the actions it opens.
 *
 * A FAB rather than a control in the page, because both things it does — add a
 * crumb, add a collection — are "make something new", and on a screen full of
 * what you already have that is the one action that is not anywhere else.
 */
export default function Fab({
  label,
  onClick,
  /** Set while the menu is open, so the glyph can turn into a close. */
  expanded = false,
  disabled = false,
  children,
}: {
  label: string
  onClick: () => void
  expanded?: boolean
  /** While the action is already running — two taps make two of them. */
  disabled?: boolean
  /** The menu it opens, stacked above the button. */
  children?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  // A menu pinned to the corner of the screen has to be dismissed deliberately:
  // on Escape, or on a click anywhere else. Both re-invoke `onClick`, because a
  // button with a menu open is a toggle — and nothing is attached at all while
  // there is no menu, so a Fab whose `onClick` is a plain action never sees any
  // of this.
  useEffect(() => {
    if (!expanded) return

    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClick()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      onClick()
      ref.current?.querySelector('button')?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [expanded, onClick])

  return (
    <div ref={ref} className={ANCHOR}>
      {children}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        aria-expanded={expanded}
        className={`${ROUND} pointer-events-auto size-14 bg-accent text-on-accent hover:bg-accent-press disabled:pointer-events-none disabled:opacity-40 ${focusRing} ${pressable}`}
      >
        {/* A quarter turn on open: the same mark that adds something becomes the
            mark that takes it back, so the menu's state is on the button rather
            than only in a panel somewhere else. */}
        <Plus
          size={26}
          strokeWidth={2}
          className={`transition-transform duration-200 ease-ios motion-reduce:transition-none ${
            expanded ? 'rotate-45' : ''
          }`}
        />
      </button>
    </div>
  )
}

/**
 * One action inside a Fab's menu: a short pill with its own label, because a
 * circle with a glyph on it is a guess and these are the two things a person is
 * about to do to a collection.
 */
export function FabAction({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`pointer-events-auto inline-flex select-none items-center gap-2 rounded-full bg-accent px-4 py-3 text-[15px] font-medium text-on-accent shadow-float hover:bg-accent-press disabled:pointer-events-none disabled:opacity-40 ${focusRing} ${pressable}`}
    >
      {children}
      <span>{label}</span>
    </button>
  )
}