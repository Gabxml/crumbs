import { useRef, useState } from 'react'
import { assetUrl } from '../lib/api'
import {
  clearWidgetImage,
  toggleChecklistItem,
  updateWidget,
  uploadWidgetImage,
} from '../lib/collections'
import type { Widget } from '../lib/collectionSchemas'

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent'
const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function DeleteWidget({ onDeleted }: { onDeleted: () => void }) {
  return (
    <button
      type="button"
      onClick={onDeleted}
      aria-label="Remove this"
      className={`rounded-md border border-border px-2 py-1 text-xs text-text hover:bg-accent-bg ${focusRing}`}
    >
      Remove
    </button>
  )
}

function NotesWidget({
  widget,
  onChange,
  onDeleted,
}: {
  widget: Extract<Widget, { type: 'notes' }>
  onChange: (next: Widget) => void
  onDeleted: () => void
}) {
  const [body, setBody] = useState(widget.body)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')

  const save = async () => {
    if (body === widget.body) return
    setSaving(true)
    setError(null)
    try {
      onChange(await updateWidget(widget.id, { body }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  const setChecklist = async (checklist: Widget extends { type: 'notes' } ? typeof widget.checklist : never) => {
    try {
      onChange(await updateWidget(widget.id, { checklist }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the checklist.')
    }
  }

  const addChecklistItem = async () => {
    const text = newItem.trim()
    if (!text) return
    setNewItem('')
    // Items already there keep their id; this one gets one from the server.
    await setChecklist([...widget.checklist.map((i) => ({ ...i })), { text, done: false }] as never)
  }

  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`notes-${widget.id}`}>
        Notes
      </label>
      <textarea
        id={`notes-${widget.id}`}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onBlur={() => void save()}
        rows={4}
        maxLength={5000}
        placeholder="Write something…"
        className={`${inputClass} resize-y`}
      />

      {widget.checklist.length > 0 && (
        <ul className="space-y-1">
          {widget.checklist.map((item) => (
            <li key={item.id}>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={item.done}
                  onChange={() =>
                    void toggleChecklistItem(widget.id, item.id, !item.done)
                      .then(onChange)
                      .catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : 'Could not tick it.'),
                      )
                  }
                  className="mt-1 size-4 accent-[var(--accent)]"
                />
                <span className={item.done ? 'line-through text-text' : 'text-text-h'}>
                  {item.text}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <label className="sr-only" htmlFor={`checklist-${widget.id}`}>
          Add a checklist item
        </label>
        <input
          id={`checklist-${widget.id}`}
          value={newItem}
          onChange={(event) => setNewItem(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== 'Enter') return
            event.preventDefault()
            void addChecklistItem()
          }}
          maxLength={200}
          placeholder="Add a checklist item"
          className={inputClass}
        />
      </div>

      <p className="text-xs text-text">
        {saving ? 'Saving…' : 'Changes save when you click away.'}
      </p>
      {error && (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      )}
      <DeleteWidget onDeleted={onDeleted} />
    </div>
  )
}

function DateWidget({
  widget,
  onChange,
  onDeleted,
}: {
  widget: Extract<Widget, { type: 'date' }>
  onChange: (next: Widget) => void
  onDeleted: () => void
}) {
  const [date, setDate] = useState(widget.date ?? '')
  const [label, setLabel] = useState(widget.label)
  const [error, setError] = useState<string | null>(null)

  const save = async (patch: { date?: string | null; label?: string }) => {
    setError(null)
    try {
      onChange(await updateWidget(widget.id, patch))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.')
    }
  }

  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`date-${widget.id}`}>
        Date
      </label>
      <input
        id={`date-${widget.id}`}
        type="date"
        value={date}
        onChange={(event) => setDate(event.target.value)}
        onBlur={() => void save({ date: date || null })}
        className={inputClass}
      />
      <label className="sr-only" htmlFor={`label-${widget.id}`}>
        Label
      </label>
      <input
        id={`label-${widget.id}`}
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        onBlur={() => void save({ label })}
        maxLength={60}
        placeholder="Label (optional)"
        className={inputClass}
      />
      {error && (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      )}
      <DeleteWidget onDeleted={onDeleted} />
    </div>
  )
}

function ImageWidget({
  widget,
  onChange,
  onDeleted,
}: {
  widget: Extract<Widget, { type: 'image' }>
  onChange: (next: Widget) => void
  onDeleted: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    try {
      onChange(await uploadWidgetImage(widget.id, file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload that picture.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {widget.image ? (
        <>
          <img
            src={assetUrl(widget.image.url)}
            alt={widget.image.originalName || 'Picture'}
            className="aspect-[4/3] w-full rounded-md object-cover"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="rounded-md border border-border px-2 py-1 text-xs text-text disabled:opacity-50"
            >
              {busy ? 'Uploading…' : 'Replace'}
            </button>
            <button
              type="button"
              onClick={() => void clearWidgetImage(widget.id).then(onChange)}
              className="rounded-md border border-border px-2 py-1 text-xs text-text"
            >
              Remove picture
            </button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={`grid aspect-[4/3] w-full place-items-center rounded-md border border-dashed border-border text-sm text-text disabled:opacity-50 ${focusRing}`}
        >
          {busy ? 'Uploading…' : 'Add a picture'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
          event.target.value = ''
        }}
      />

      {error && (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      )}
      <DeleteWidget onDeleted={onDeleted} />
    </div>
  )
}

function LinkWidget({
  widget,
  onChange,
  onDeleted,
}: {
  widget: Extract<Widget, { type: 'link' }>
  onChange: (next: Widget) => void
  onDeleted: () => void
}) {
  const [url, setUrl] = useState(widget.url ?? '')
  const [error, setError] = useState<string | null>(null)

  const save = async () => {
    setError(null)
    try {
      onChange(await updateWidget(widget.id, { url: url || null }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that link.')
    }
  }

  return (
    <div className="space-y-2">
      <label className="sr-only" htmlFor={`link-${widget.id}`}>
        Link
      </label>
      <input
        id={`link-${widget.id}`}
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onBlur={() => void save()}
        placeholder="https://…"
        className={inputClass}
      />

      {widget.preview?.status === 'ok' && (
        <a
          href={widget.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="block rounded-md border border-border p-2 text-sm no-underline hover:bg-accent-bg"
        >
          {widget.preview.image && (
            <img
              src={assetUrl(widget.preview.image)}
              alt=""
              loading="lazy"
              className="mb-2 aspect-[2/1] w-full rounded object-cover"
            />
          )}
          {widget.preview.title || widget.url}
          {widget.preview.siteName && (
            <span className="block text-xs text-text">{widget.preview.siteName}</span>
          )}
        </a>
      )}
      {widget.preview?.status === 'unavailable' && (
        <p className="text-xs text-text">
          The link was saved but its preview could not be fetched.
        </p>
      )}

      {error && (
        <p role="alert" className="text-xs text-accent">
          {error}
        </p>
      )}
      <DeleteWidget onDeleted={onDeleted} />
    </div>
  )
}

export default function WidgetView({
  widget,
  onChange,
  onDeleted,
}: {
  widget: Widget
  onChange: (next: Widget) => void
  onDeleted: () => void
}) {
  const shared = 'rounded-md border border-border p-3'

  if (widget.type === 'notes') {
    return (
      <div className={shared}>
        <NotesWidget widget={widget} onChange={onChange} onDeleted={onDeleted} />
      </div>
    )
  }
  if (widget.type === 'date') {
    return (
      <div className={shared}>
        <DateWidget widget={widget} onChange={onChange} onDeleted={onDeleted} />
      </div>
    )
  }
  if (widget.type === 'image') {
    return (
      <div className={shared}>
        <ImageWidget widget={widget} onChange={onChange} onDeleted={onDeleted} />
      </div>
    )
  }
  return (
    <div className={shared}>
      <LinkWidget widget={widget} onChange={onChange} onDeleted={onDeleted} />
    </div>
  )
}

