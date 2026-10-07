import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { uploadCrumb } from '../lib/crumbs'
import { resizeToFit } from '../lib/image'
import type { Crumb } from '../lib/schemas'
import type { CollectionOption } from '../lib/collections'

export type { CollectionOption }

const MAX_BATCH = 10
const CAPTION_MAX = 60
const NO_COLLECTIONS: CollectionOption[] = []

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent'

type Item = {
  id: string
  file: File
  preview: string
  caption: string
  status: 'idle' | 'uploading' | 'error'
  error: string | null
}

function release(items: Item[]) {
  items.forEach((item) => URL.revokeObjectURL(item.preview))
}

export default function CrumbUploader({
  onUploaded,
  collections = NO_COLLECTIONS,
}: {
  onUploaded: (crumb: Crumb) => void
  collections?: CollectionOption[]
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const itemsRef = useRef<Item[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [choice, setChoice] = useState('')

  const releaseAll = useCallback(() => release(itemsRef.current), [])

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  useEffect(() => releaseAll, [releaseAll])

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (items.length > 0 && !dialog.open) dialog.showModal()
    if (items.length === 0 && dialog.open) dialog.close()
  }, [items.length])

  const choose = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    )
    event.target.value = ''
    if (files.length === 0) return

    setNotice(
      files.length > MAX_BATCH ? `Only the first ${MAX_BATCH} photos were added.` : null,
    )
    setItems(
      files.slice(0, MAX_BATCH).map((file, index) => ({
        id: `${Date.now()}-${index}`,
        file,
        preview: URL.createObjectURL(file),
        caption: '',
        status: 'idle',
        error: null,
      })),
    )

    setChoice('')
  }

  const update = (id: string, changes: Partial<Item>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...changes } : item)),
    )
  }

  const close = () => {
    if (busy) return
    release(items)
    setItems([])
    setNotice(null)
    setChoice('')
  }

  const upload = async () => {
    setBusy(true)
    const collectionId = choice || null

    const finished = new Set<string>()
    // The crumb is saved even when the collection copy is refused, so these are
    // reported together at the end rather than failing the whole upload.
    const copyErrors = new Set<string>()

    for (const item of items) {
      update(item.id, { status: 'uploading', error: null })
      try {
        const image = await resizeToFit(item.file)
        const result = await uploadCrumb(image, item.caption, collectionId)
        if (result.collectionCopyError) copyErrors.add(result.collectionCopyError)
        onUploaded(result.crumb)
        finished.add(item.id)
      } catch (error) {
        update(item.id, {
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed. Try again.',
        })
      }
    }

    release(items.filter((item) => finished.has(item.id)))
    setItems((current) => current.filter((item) => !finished.has(item.id)))
    setNotice(copyErrors.size > 0 ? `Uploaded, but not added to the collection: ${[...copyErrors][0]}` : null)
    setBusy(false)
  }

  const hasError = items.some((item) => item.status === 'error')

  return (
    <>
      <button
        type="button"
        aria-label="Add crumbs"
        onClick={() => inputRef.current?.click()}
        className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-6 z-20 grid size-14 place-items-center rounded-full bg-accent text-bg shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={choose}
        className="hidden"
      />

      <dialog
        ref={dialogRef}
        aria-labelledby="upload-heading"
        onClose={close}
        onCancel={(event) => {
          if (busy) event.preventDefault()
        }}
        className="m-auto max-h-[85dvh] w-[min(34rem,calc(100%-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-bg p-0 text-left text-text open:flex backdrop:bg-black/60"
      >
        <div className="border-b border-border px-5 py-3">
          <h2 id="upload-heading" className="my-0!">
            Add crumbs
          </h2>
        </div>

        <ul className="divide-y divide-border overflow-y-auto">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3 px-5 py-3">
              <img
                src={item.preview}
                alt=""
                className="size-20 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1 space-y-1">
                <input
                  type="text"
                  value={item.caption}
                  maxLength={CAPTION_MAX}
                  disabled={busy}
                  placeholder="Add a caption (optional)"
                  aria-label={`Caption for ${item.file.name}`}
                  onChange={(event) => update(item.id, { caption: event.target.value })}
                  className={inputClass}
                />
                <p aria-hidden="true" className="text-right text-xs text-text">
                  {item.caption.length}/{CAPTION_MAX}
                </p>
                {item.status === 'uploading' && (
                  <p role="status" className="text-sm text-text">
                    Uploading…
                  </p>
                )}
                {item.status === 'error' && (
                  <p role="alert" className="text-sm text-accent">
                    {item.error}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>

        <div className="space-y-3 border-t border-border px-5 py-4">
          <div className="space-y-2">
            <label htmlFor="upload-collection" className="block font-heading text-text-h">
              Add to a collection (optional)
            </label>
            <select
              id="upload-collection"
              value={choice}
              disabled={busy}
              onChange={(event) => setChoice(event.target.value)}
              className={inputClass}
            >
              <option value="">No collection</option>
              {collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.title || 'Untitled collection'}
                </option>
              ))}
            </select>
            {collections.length === 0 && (
              <p className="text-sm text-text">You have no collections yet.</p>
            )}
          </div>

          <p className="text-sm text-text">
            Photos are cropped to a square in the grid. With no caption, the upload date
            is shown instead.
          </p>
          {notice && <p className="text-sm text-text">{notice}</p>}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="rounded-md border border-border px-4 py-2 font-heading text-text-h disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void upload()}
              disabled={busy}
              className="rounded-md bg-accent px-4 py-2 font-heading text-bg disabled:opacity-50"
            >
              {busy
                ? 'Uploading…'
                : hasError
                  ? 'Try again'
                  : `Upload ${items.length} photo${items.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}