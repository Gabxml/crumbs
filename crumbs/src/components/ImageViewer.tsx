import { useEffect, useRef } from 'react'
import { ArrowLeft } from '@untitledui/icons/ArrowLeft'
import { ArrowRight } from '@untitledui/icons/ArrowRight'
import { Trash01 } from '@untitledui/icons/Trash01'
import { assetUrl } from '../lib/api'
import Button from './Button'
import { focusRing } from '../lib/ui'

/**
 * One picture at full size.
 *
 * A native <dialog>, like Modal, so it gets the top layer and Escape for free.
 * When the row holds more than one picture the arrows step through them in
 * place — a poster card is too small to judge a photo by, and being sent to a
 * separate page to see the next one loses your place in the row.
 */
export default function ImageViewer({
  images,
  index,
  onIndexChange,
  onClose,
  onDelete,
}: {
  images: { url: string; name: string | null | undefined }[]
  /** Which picture is on screen, or null when the viewer is shut. */
  index: number | null
  onIndexChange: (next: number) => void
  onClose: () => void
  /** Removes the picture on screen and shuts the viewer. */
  onDelete?: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  // A picture can vanish from under the viewer — deleted, or the row reloaded —
  // and -1 means "not found", so neither is a position worth showing.
  const current = index !== null && index >= 0 ? images[index] : undefined
  const open = current !== undefined

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // The arrows and Escape, bound here rather than left to the <details>-style
  // native handling because a dialog's own Escape only closes it.
  useEffect(() => {
    if (!open || index === null) return

    const step = (delta: number) =>
      onIndexChange((index + delta + images.length) % images.length)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        step(1)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        step(-1)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, index, images.length, onIndexChange])

  const many = images.length > 1

  // The dialog stays mounted and shuts itself through `open` above, so its
  // contents are guarded rather than the element being torn out of the tree —
  // which would leave a dialog that was mid-open with nothing left to close it.
  return (
    <dialog
      ref={ref}
      aria-label={current?.name || 'Picture'}
      onClose={onClose}
      onClick={(event) => {
        // A click that lands on the dialog rather than the picture is a dismiss.
        if (event.target === event.currentTarget) onClose()
      }}
      className="sheet centred max-h-svh w-full max-w-none items-center justify-center bg-transparent p-4 text-text backdrop:bg-black/80 backdrop:backdrop-blur-xl"
    >
      {current && (
        <div className="flex max-h-svh flex-col items-center justify-center gap-4">
          <img
            src={assetUrl(current.url)}
            alt={current.name || 'Picture'}
            className="max-h-[78svh] max-w-full rounded-media object-contain"
          />

          <div className="flex flex-wrap items-center justify-center gap-4">
            {many && index !== null ? (
              <>
                <button
                  type="button"
                  onClick={() => onIndexChange((index - 1 + images.length) % images.length)}
                  aria-label="Previous picture"
                  className={`grid size-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 ${focusRing}`}
                >
                  <ArrowLeft size={20} strokeWidth={1.75} />
                </button>
                <span className="text-[14px] text-white/80">
                  {index + 1} of {images.length}
                </span>
                <button
                  type="button"
                  onClick={() => onIndexChange((index + 1) % images.length)}
                  aria-label="Next picture"
                  className={`grid size-11 place-items-center rounded-full bg-white/15 text-white hover:bg-white/25 ${focusRing}`}
                >
                  <ArrowRight size={20} strokeWidth={1.75} />
                </button>
              </>
            ) : (
              <span className="text-[14px] text-white/80">{current.name || 'Picture'}</span>
            )}

            {/* At full size there is nowhere the controls are not, so this is the
                one place a picture can be thrown away without hunting for it. */}
            {onDelete && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  if (window.confirm('Delete this picture? This cannot be undone.')) onDelete()
                }}
                className="bg-white/15 text-white hover:brightness-110"
              >
                <Trash01 size={14} strokeWidth={1.75} />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}