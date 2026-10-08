import { useCallback, useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { uploadCrumb } from '../lib/crumbs'
import { resizeToFit } from '../lib/image'
import type { Crumb } from '../lib/schemas'
import type { CollectionOption } from '../lib/collections'
import { Plus } from '@untitledui/icons/Plus'
import Button from './Button'
import Modal from './Modal'

export type { CollectionOption }

const MAX_BATCH = 10
const CAPTION_MAX = 60
const NO_COLLECTIONS: CollectionOption[] = []

const inputClass =
  'w-full rounded-control bg-fill px-4 py-2.5 text-[15px] text-text-h placeholder:text-inactive outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

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
        // A circle, not a squircle: this is the one element that floats over the
        // canvas, and the diffuse shadow is what separates it from the photos.
        // It sits above the mobile tab bar, hence the raised bottom offset.
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-5 z-20 grid size-14 place-items-center rounded-full bg-accent text-on-accent shadow-float transition duration-200 ease-ios active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent lg:bottom-8"
      >
        <Plus size={26} strokeWidth={2} />
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={choose}
        className="hidden"
      />

      {/* The sheet is driven by whether there is anything to upload, so it opens
          as soon as photos are picked and closes when the queue empties. */}
      <Modal open={items.length > 0} onClose={close} title="Add crumbs">
        <div className="flex min-h-0 flex-col">
          <ul className="-mx-1 min-h-0 flex-1 space-y-1 overflow-y-auto px-1">
            {items.map((item) => (
              <li key={item.id} className="flex gap-3 py-1.5">
                <img
                  src={item.preview}
                  alt=""
                  className="size-20 shrink-0 rounded-media object-cover"
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
                  <p aria-hidden="true" className="text-right text-[13px] text-text">
                    {item.caption.length}/{CAPTION_MAX}
                  </p>
                  {item.status === 'uploading' && (
                    <p role="status" className="text-[14px] text-text">
                      Uploading…
                    </p>
                  )}
                  {item.status === 'error' && (
                    <p role="alert" className="text-[14px] text-danger">
                      {item.error}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* A rule rather than a second card: the sheet is one surface, and a
              hairline is the only divider the system allows. */}
          <div className="mt-4 space-y-3 border-t border-fill pt-4">
            <div className="space-y-1.5">
              <label htmlFor="upload-collection" className="text-[13px] font-medium text-text-h">
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
                <p className="text-[14px] text-text">You have no collections yet.</p>
              )}
            </div>

            <p className="text-[14px] text-text">
              Photos are cropped to a square in the grid. With no caption, the upload date
              is shown instead.
            </p>
            {notice && <p className="text-[14px] text-text">{notice}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={close} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void upload()} disabled={busy}>
                {busy
                  ? 'Uploading…'
                  : hasError
                    ? 'Try again'
                    : `Upload ${items.length} photo${items.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}