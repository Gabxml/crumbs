import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { RADIUS } from '../lib/ui'
import { IconButton } from './Button'
import Squircle from './Squircle'

/**
 * A native <dialog> styled as an iOS sheet: blurred and dimmed backdrop,
 * squircle panel rising from the bottom on mobile and scaling in on desktop.
 * Native is worth keeping over a hand-rolled overlay because it brings the top
 * layer, the inert background, Escape handling and focus trapping with it.
 *
 * The dialog itself is transparent and full-bleed; the squircle panel floats
 * inside it. That keeps the clip-path off the top-layer element and lets the
 * panel round on all four sides without needing to hide its bottom corners
 * behind the viewport edge.
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  className,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const headingId = `${title.replace(/\W+/g, '-').toLowerCase()}-sheet-heading`

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      onClose={onClose}
      onClick={(event) => {
        // The dialog element is the whole top-layer area, so a click landing on
        // it rather than on the panel is a dismiss.
        if (event.target === event.currentTarget) onClose()
      }}
      className={`sheet max-h-[92svh] w-full max-w-none bg-transparent p-2 text-left text-text backdrop:bg-black/30 backdrop:backdrop-blur-xl sm:max-w-[34rem] ${className ?? ''}`}
    >
      <Squircle
        radius={RADIUS.card}
        className="flex max-h-[calc(92svh-1rem)] w-full flex-col overflow-hidden bg-surface p-5 shadow-float"
      >
        <header className="flex items-start justify-between gap-4 pb-4">
          <h2 id={headingId} className="text-[17px] font-semibold tracking-heading text-text-h">
            {title}
          </h2>
          <IconButton label="Close" variant="plain" onClick={onClose}>
            <CloseGlyph />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </Squircle>
    </dialog>
  )
}

/** A close cross, inline so this file carries no icon dependency. */
function CloseGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}
