import { useEffect, useRef, useState } from 'react'
import { crumbLabel, crumbSrc, deleteCrumb } from '../lib/crumbs'
import { ApiError } from '../lib/api'
import type { Crumb } from '../lib/schemas'

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
    <dialog
      ref={ref}
      aria-label="Crumb"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto max-h-[94dvh] max-w-[94vw] overflow-visible border-0 bg-transparent p-0 text-white open:flex backdrop:bg-black/40 backdrop:backdrop-blur-lg"
    >
      {crumb && (
        <figure className="m-0 flex flex-col items-center gap-3 text-center">
          <img
            src={crumbSrc(crumb.imageUrl)}
            alt={crumbLabel(crumb)}
            className="aspect-square w-[min(90vw,70dvh)] rounded-md object-cover shadow-2xl"
          />
          <figcaption className="w-[min(90vw,70dvh)] text-lg break-words">
            {crumbLabel(crumb)}
          </figcaption>

          {error?.crumbId === crumb.id && (
            <p role="alert" className="text-sm text-red-300">
              {error.message}
            </p>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy}
              className="rounded-md border border-red-300/60 px-4 py-2 font-heading text-red-200 disabled:opacity-50"
            >
              {busy ? 'Deleting…' : 'Delete'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-md border border-white/50 px-4 py-2 font-heading text-white disabled:opacity-50"
            >
              Close
            </button>
          </div>
        </figure>
      )}
    </dialog>
  )
}
