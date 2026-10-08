import { useRef, useState } from 'react'
import { assetUrl } from '../lib/api'
import {
  clearWidgetImage,
  toggleChecklistItem,
  updateWidget,
  uploadWidgetImage,
} from '../lib/collections'
import { Image01 } from '@untitledui/icons/Image01'
import { Trash01 } from '@untitledui/icons/Trash01'
import type { Widget } from '../lib/collectionSchemas'
import Button from './Button'
import Card from './Card'
import Squircle from './Squircle'
import { RADIUS } from '../lib/ui'

const inputClass =
  'w-full rounded-control bg-fill px-4 py-2.5 text-[15px] text-text-h placeholder:text-inactive outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

function DeleteWidget({ onDeleted }: { onDeleted: () => void }) {
  return (
    <Button variant="danger" size="sm" onClick={onDeleted}>
      <Trash01 size={14} strokeWidth={1.75} />
      Remove
    </Button>
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
              <label className="flex items-start gap-2.5 py-0.5 text-[15px]">
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
                  className="mt-1 size-[18px] shrink-0 accent-[var(--accent)]"
                />
                <span className={item.done ? 'text-[15px] text-text line-through' : 'text-[15px] text-text-h'}>
                  {item.text}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div>
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

      <p className="text-[13px] text-text">
        {saving ? 'Saving…' : 'Changes save when you click away.'}
      </p>
      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div>
        <DeleteWidget onDeleted={onDeleted} />
      </div>
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
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div>
        <DeleteWidget onDeleted={onDeleted} />
      </div>
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
          <Squircle radius={RADIUS.media} className="overflow-hidden bg-fill">
            <img
              src={assetUrl(widget.image.url)}
              alt={widget.image.originalName || 'Picture'}
              loading="lazy"
              className="aspect-[4/3] w-full object-cover"
            />
          </Squircle>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              {busy ? 'Uploading…' : 'Replace'}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void clearWidgetImage(widget.id).then(onChange)}
            >
              Remove picture
            </Button>
          </div>
        </>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="grid aspect-[4/3] w-full place-items-center gap-2 rounded-media bg-fill text-[14px] font-medium text-text transition duration-200 ease-ios hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50"
        >
          <Image01 size={22} strokeWidth={1.75} className="text-inactive" />
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
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div>
        <DeleteWidget onDeleted={onDeleted} />
      </div>
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
          className="block overflow-hidden rounded-media bg-fill p-3 no-underline transition duration-200 ease-ios hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {widget.preview.image && (
            <Squircle radius={RADIUS.media} className="mb-2 overflow-hidden">
              <img
                src={assetUrl(widget.preview.image)}
                alt=""
                loading="lazy"
                className="aspect-[2/1] w-full object-cover"
              />
            </Squircle>
          )}
          <span className="block text-[15px] font-medium text-text-h">
            {widget.preview.title || widget.url}
          </span>
          {widget.preview.siteName && (
            <span className="block text-[13px] text-text">{widget.preview.siteName}</span>
          )}
        </a>
      )}
      {widget.preview?.status === 'unavailable' && (
        <p className="text-[13px] text-text">
          The link was saved but its preview could not be fetched.
        </p>
      )}

      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
      <div>
        <DeleteWidget onDeleted={onDeleted} />
      </div>
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
  if (widget.type === 'notes') {
    return (
      <Card className="flex h-full flex-col gap-2.5">
        <NotesWidget widget={widget} onChange={onChange} onDeleted={onDeleted} />
      </Card>
    )
  }
  if (widget.type === 'date') {
    return (
      <Card className="flex h-full flex-col gap-2.5">
        <DateWidget widget={widget} onChange={onChange} onDeleted={onDeleted} />
      </Card>
    )
  }
  if (widget.type === 'image') {
    return (
      <Card className="flex h-full flex-col gap-2.5">
        <ImageWidget widget={widget} onChange={onChange} onDeleted={onDeleted} />
      </Card>
    )
  }
  return (
    <Card className="flex h-full flex-col gap-2.5">
      <LinkWidget widget={widget} onChange={onChange} onDeleted={onDeleted} />
    </Card>
  )
}

