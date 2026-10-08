import { useEffect, useRef, useState } from 'react'
import { Trash01 } from '@untitledui/icons/Trash01'
import { crumbLabel, crumbSrc, deleteCrumb } from '../lib/crumbs'
import { ApiError } from '../lib/api'
import type { Crumb } from '../lib/schemas'
import Button from './Button'
import Squircle from './Squircle'
import { RADIUS } from '../lib/ui'

export default function CrumbViewer({
  crumb,
  onClose,
  onDeleted,
}: {
  crumb: Crumb | null
  onClose: () => void
  // Called after the crumb is gone server-side, so the page can drop it from
  // whatever list it is holding.
  onDeleted?: (id: string) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const open = crumb !== null

  const [busy, setBusy] = useState(false)
  // The error is tagged with the crumb it belongs to, so opening a different one
  // can never show a message about this. Cheaper than clearing it in an effect.
  const [error, setError] = useState<{ crumbId: string; message: string } | null>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const remove = async () => {
    if (!crumb) return
    if (!window.confirm('Delete this crumb? This cannot be undone.')) return

    setBusy(true)
    setError(null)
    try {
      await deleteCrumb(crumb.id)
      onDeleted?.(crumb.id)
      onClose()
    } catch (err) {
      setError({
        crumbId: crumb.id,
        message: err instanceof ApiError ? err.message : 'Could not delete that crumb.',
      })
      setBusy(false)
    }
  }

  return (
    // A lightbox rather than a sheet: the photo is the content, so it gets the
    // whole viewport and the backdrop only dims around it. The two controls sit
    // on the backdrop as white circles so they read over any image.
    <dialog
      ref={ref}
      aria-label="Crumb"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto max-h-[94dvh] max-w-[94vw] overflow-visible border-0 bg-transparent p-0 text-text open:flex backdrop:bg-black/45 backdrop:backdrop-blur-lg"
    >
      {crumb && (
        <figure className="m-0 flex flex-col items-center gap-3 text-center">
          <Squircle
            radius={RADIUS.card}
            className="overflow-hidden bg-fill shadow-float"
          >
            <img
              src={crumbSrc(crumb.imageUrl)}
              alt={crumbLabel(crumb)}
              className="aspect-square w-[min(90vw,70dvh)] object-cover"
            />
          </Squircle>

          <figcaption className="max-w-[min(90vw,40rem)] text-[15px] break-words text-text-h">
            {crumbLabel(crumb)}
          </figcaption>

          {error?.crumbId === crumb.id && (
            <p role="alert" className="text-[15px] text-danger">
              {error.message}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <Button
              variant="secondary"
              onClick={() => void remove()}
              disabled={busy}
              className="bg-white/85 text-danger backdrop-blur-xl"
            >
              <Trash01 size={16} strokeWidth={1.75} />
              {busy ? 'Deleting…' : 'Delete'}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={busy}
              className="bg-white/85 text-text-h backdrop-blur-xl"
            >
              Close
            </Button>
          </div>
        </figure>
      )}
    </dialog>
  )
}
