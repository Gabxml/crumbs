import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { assetUrl } from '../lib/api'
import {
  clearWidgetImage,
  toggleChecklistItem,
  updateWidget,
  uploadWidgetImage,
} from '../lib/collections'
import { AlignLeft } from '@untitledui/icons/AlignLeft'
import { Calendar } from '@untitledui/icons/Calendar'
import { Image01 } from '@untitledui/icons/Image01'
import { Link01 } from '@untitledui/icons/Link01'
import { Trash01 } from '@untitledui/icons/Trash01'
import type { Widget } from '../lib/collectionSchemas'
import Button from './Button'
import Card from './Card'
import DateCircle from './DateCircle'
import Modal from './Modal'
import { splitDate, tiltFor } from '../lib/dates'
import { pressable, RADIUS } from '../lib/ui'

const inputClass =
  'w-full rounded-control bg-fill px-3 py-2 text-[14px] text-text-h placeholder:text-inactive outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

// In the editor there is room, so this grows to fit with neither a scrollbar nor
// a grabber, and starts tall enough to be worth typing into.
const notesClass =
  'min-h-44 w-full resize-none overflow-hidden rounded-control bg-fill px-4 py-3 text-[15px] leading-relaxed text-text-h placeholder:text-inactive outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

// A portrait card, tilted the way it lies in the row. Hovering lifts it out of
// the fan and squares it up, which is also what makes it clear it is the one
// being reached for.
const POSTER =
  'w-[220px] shrink-0 rotate-(--fan-rotate) transition duration-200 ease-ios ' +
  'hover:rotate-0 hover:-translate-y-2 motion-reduce:hover:translate-y-0'

// overflow-hidden is what rounds the corners of the card's contents. The
// superellipse only draws a clip-path, and index.css takes that away on browsers
// with corner-shape, leaving border-radius — which does nothing to a child unless
// something is hiding the overflow. Without it a picture filling the card shows
// its own square corners over the top of the curve.
const POSTER_BODY = 'relative h-[320px] overflow-hidden'

/** The whole card is one big tap target, for the types that open an editor. */
const OPENABLE = `cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${pressable}`

function PosterLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-xs font-medium tracking-wide text-text uppercase">
      {children}
    </span>
  )
}

function DeleteWidget({ onDeleted }: { onDeleted: () => void }) {
  return (
    <Button variant="danger" size="sm" onClick={onDeleted} className="w-full">
      <Trash01 size={14} strokeWidth={1.75} />
      Remove
    </Button>
  )
}

/**
 * A textarea that grows to fit what is typed into it.
 *
 * A fixed-height one inside a poster card either scrolls — a scrollbar in a
 * 220px column is mostly track — or is resizable, and its corner grabber is the
 * diagonal stripe that looks like a zigzag. So the height is measured from the
 * content and applied back, which needs no scrollbar and no grabber.
 */
function GrowingTextarea({
  value,
  onChange,
  ...props
}: {
  value: string
  onChange: (value: string) => void
} & Omit<React.ComponentPropsWithoutRef<'textarea'>, 'value' | 'onChange' | 'className'>) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = ref.current
    if (!el) return
    // Collapse first, so shrinking the text also shrinks the box.
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useLayoutEffect(resize, [value])

  return (
    <textarea
      {...props}
      ref={ref}
      value={value}
      onChange={(event) => {
        onChange(event.target.value)
        resize()
      }}
      className={notesClass}
    />
  )
}

function NotesWidget({
  widget,
  editing,
  onEditingChange,
  onChange,
  onDeleted,
}: {
  widget: Extract<Widget, { type: 'notes' }>
  editing: boolean
  onEditingChange: (open: boolean) => void
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

  // A new item is sent without an id — the server mints it — so what goes in is
// wider than what comes back out.
type ChecklistIn = { id?: string; text: string; done: boolean }

const setChecklist = async (checklist: ChecklistIn[]) => {
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
    await setChecklist([...widget.checklist.map((i) => ({ ...i })), { text, done: false }])
  }

  const done = widget.checklist.filter((item) => item.done).length
  const nothing = !widget.body.trim() && widget.checklist.length === 0

  return (
    <>
      {/* The card is a summary of the notes, not a form: the editing happens in
          the middle of the screen where there is room to read it back. */}
      <button
        type="button"
        onClick={() => onEditingChange(true)}
        className={`flex h-full w-full flex-col items-start gap-2 p-5 text-left ${OPENABLE}`}
      >
        <PosterLabel>
          <AlignLeft size={13} strokeWidth={1.75} />
          Notes
        </PosterLabel>

        {widget.body.trim() ? (
          <span className="line-clamp-8 text-[14px] leading-relaxed text-text-h">
            {widget.body}
          </span>
        ) : (
          <span className="text-[14px] text-text">No notes yet.</span>
        )}

        {widget.checklist.length > 0 && (
          <ul className="mt-auto space-y-0.5">
            {widget.checklist.slice(0, 6).map((item) => (
              <li key={item.id} className="flex items-start gap-1.5 text-[13px]">
                <span className="text-text">{item.done ? '☑' : '☐'}</span>
                <span className={item.done ? 'text-text line-through' : 'text-text-h'}>
                  {item.text}
                </span>
              </li>
            ))}
          </ul>
        )}

        {nothing && <span className="mt-auto text-[13px] text-inactive">Click to write</span>}
      </button>

      {editing &&
        createPortal(
          <Modal
            open
            centered
            title="Notes"
            onClose={() => {
              void save()
              onEditingChange(false)
            }}
          >
          <div className="space-y-4">
            <label className="sr-only" htmlFor={`notes-${widget.id}`}>
              Notes
            </label>
            <GrowingTextarea
              id={`notes-${widget.id}`}
              value={body}
              onChange={setBody}
              onBlur={() => void save()}
              maxLength={5000}
              placeholder="Write something…"
            />

            <div className="space-y-2">
              <p className="text-[13px] font-medium text-text-h">
                Checklist
                {widget.checklist.length > 0 && (
                  <span className="ml-1.5 font-normal text-text">
                    {done} of {widget.checklist.length} done
                  </span>
                )}
              </p>

              {widget.checklist.length > 0 && (
                <ul className="space-y-1">
                  {widget.checklist.map((item) => (
                    <li key={item.id}>
                      <label className="flex items-start gap-2 py-1 text-[15px]">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() =>
                            void toggleChecklistItem(widget.id, item.id, !item.done)
                              .then(onChange)
                              .catch((err: unknown) =>
                                setError(
                                  err instanceof Error ? err.message : 'Could not tick it.',
                                ),
                              )
                          }
                          className="mt-1 size-[18px] shrink-0 accent-[var(--accent)]"
                        />
                        <span
                          className={item.done ? 'text-text line-through' : 'text-text-h'}
                        >
                          {item.text}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}

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

            <Button variant="danger" onClick={onDeleted}>
              <Trash01 size={16} strokeWidth={1.75} />
              Delete these notes
            </Button>
          </div>
          </Modal>,
          document.body,
        )}
    </>
  )
}

function DateWidget({
  widget,
  editing,
  onEditingChange,
  onChange,
  onDeleted,
}: {
  widget: Extract<Widget, { type: 'date' }>
  editing: boolean
  onEditingChange: (open: boolean) => void
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

  const { month, day, year } = splitDate(widget.date)

  return (
    <>
      {/* A date reads at a glance as a calendar page: the month small at the top,
          the number large in the middle, and whatever it is for underneath. */}
      <button
        type="button"
        onClick={() => onEditingChange(true)}
        className={`flex h-full w-full flex-col items-center justify-center gap-1 p-5 text-center ${OPENABLE}`}
      >
        {day ? (
          <>
            <PosterLabel>
              <Calendar size={13} strokeWidth={1.75} />
              {month}
            </PosterLabel>

            {/* Day in its ring, then the year — the whole date read off one
                calendar page top to bottom rather than split across the page.
                The ring is absolutely positioned behind the number so the digit
                is centred in it whatever its width, one or two. */}
            <div className="flex flex-col items-center">
              <span className="relative grid h-[112px] w-[120px] place-items-center">
                <DateCircle />
                <span className="text-[76px] leading-none font-bold tracking-heading text-text-h">
                  {day}
                </span>
              </span>
              <span className="text-[14px] leading-none text-text">{year}</span>
            </div>

            {widget.label && (
              <span className="mt-1 text-[14px] text-text">{widget.label}</span>
            )}
          </>
        ) : (
          <>
            <PosterLabel>
              <Calendar size={13} strokeWidth={1.75} />
              Date
            </PosterLabel>
            <span className="text-[15px] text-text">No date yet.</span>
            <span className="mt-auto text-[13px] text-inactive">Click to pick one</span>
          </>
        )}
      </button>

      {editing &&
        createPortal(
          <Modal open centered title="Date" onClose={() => onEditingChange(false)}>
          <div className="space-y-4">
            {day && (
              <div className="flex flex-col items-center gap-1 rounded-media bg-fill py-6 text-center">
                <span className="text-[13px] tracking-wide text-text uppercase">{month}</span>
                {/* The same ring, scaled down with the number — the preview has to
                    be the same date the card is. */}
                <span className="relative grid h-[84px] w-[90px] place-items-center">
                  <DateCircle />
                  <span className="text-[56px] leading-none font-bold tracking-heading text-text-h">
                    {day}
                  </span>
                </span>
                <span className="text-[13px] leading-none text-text">{year}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor={`date-${widget.id}`} className="text-[13px] font-medium text-text-h">
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
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`label-${widget.id}`} className="text-[13px] font-medium text-text-h">
                Label
              </label>
              <input
                id={`label-${widget.id}`}
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                onBlur={() => void save({ label })}
                maxLength={60}
                placeholder="What is this date for? (optional)"
                className={inputClass}
              />
            </div>

            {error && (
              <p role="alert" className="text-[13px] text-danger">
                {error}
              </p>
            )}

            <Button variant="danger" onClick={onDeleted}>
              <Trash01 size={16} strokeWidth={1.75} />
              Delete this date
            </Button>
          </div>
          </Modal>,
          document.body,
        )}
    </>
  )
}

function ImageWidget({
  widget,
  onChange,
  onDeleted,
  onOpen,
}: {
  widget: Extract<Widget, { type: 'image' }>
  onChange: (next: Widget) => void
  onDeleted: () => void
  onOpen?: () => void
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
    <>
      {/* Full bleed: a picture is the whole card, with no label or controls over
          it. The caption the prototype put here would sit on the photo. */}
      {widget.image ? (
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className={`h-full w-full overflow-hidden ${
            onOpen ? `cursor-zoom-in ${OPENABLE}` : 'cursor-default'
          }`}
        >
          {/* No radius of its own: the card's shape is the one that should show,
              and a second, differently-rounded corner on top of it is what makes a
              photo look pasted into its frame. */}
          <img
            src={assetUrl(widget.image.url)}
            alt={widget.image.originalName || 'Picture'}
            loading="lazy"
            decoding="async"
            className="size-full object-cover"
          />
        </button>
      ) : (
        <div className="flex h-full flex-col gap-2 p-5">
          <PosterLabel>
            <Image01 size={13} strokeWidth={1.75} />
            Picture
          </PosterLabel>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={`grid flex-1 place-items-center gap-2 rounded-media border-2 border-dashed border-inactive text-[14px] font-medium text-text transition-colors duration-200 ease-ios hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50`}
          >
            <Image01 size={22} strokeWidth={1.75} />
            {busy ? 'Uploading…' : 'Add a picture'}
          </button>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void clearWidgetImage(widget.id).then(onChange)}
              disabled={busy}
              className="flex-1"
            >
              Clear
            </Button>
            <DeleteWidget onDeleted={onDeleted} />
          </div>

          {error && (
            <p role="alert" className="text-[12px] text-danger">
              {error}
            </p>
          )}
        </div>
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
    </>
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
    <div className="flex h-full flex-col gap-2 overflow-y-auto p-5">
      <PosterLabel>
        <Link01 size={13} strokeWidth={1.75} />
        Link
      </PosterLabel>

      {widget.preview?.image && (
        <img
          src={assetUrl(widget.preview.image)}
          alt=""
          loading="lazy"
          className="min-h-28 w-full rounded-control object-cover"
        />
      )}

      {widget.preview?.status === 'ok' && (
        <a
          href={widget.url ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="block rounded-control no-underline transition-colors duration-200 ease-ios hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span className="block text-[14px] font-medium text-text-h">
            {widget.preview.title || widget.url}
          </span>
          {widget.preview.siteName && (
            <span className="block text-[12px] text-text">{widget.preview.siteName}</span>
          )}
        </a>
      )}
      {widget.preview?.status === 'unavailable' && (
        <p className="text-[12px] text-text">
          The link was saved but its preview could not be fetched.
        </p>
      )}

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

      {error && (
        <p role="alert" className="text-[12px] text-danger">
          {error}
        </p>
      )}
      <div className="mt-auto">
        <DeleteWidget onDeleted={onDeleted} />
      </div>
    </div>
  )
}

/**
 * One thing inside a collection, as a portrait card lying in its row.
 *
 * A picture fills its card and opens full size. Notes and a date show a summary
 * of themselves and open into a centred editor, because neither can be read or
 * typed into at 220px. A link is edited where it lies.
 *
 * Only CollectionDetail uses this, so the row strip on that page is the only
 * thing that has to know about it.
 */
export default function WidgetView({
  widget,
  onChange,
  onDeleted,
  onOpenImage,
}: {
  widget: Widget
  onChange: (next: Widget) => void
  onDeleted: () => void
  /** Opens this picture full size. Only image widgets act on it. */
  onOpenImage?: () => void
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div
      className={POSTER}
      style={{ '--fan-rotate': `${tiltFor(widget.id)}deg` } as React.CSSProperties}
    >
      {/* The card is the frame and nothing more: every widget draws the inset it
          needs itself. It used to pad as well, so a picture was cropped to a
          smaller rectangle in the middle of a 40px white border — the one thing a
          photograph should never be shown in. A picture has no inset of its own
          and so fills the card exactly as it does on a folder tile. */}
      <Card as="article" floating radius={RADIUS.media} className={POSTER_BODY} padded={false}>
        {widget.type === 'notes' && (
          <NotesWidget
            widget={widget}
            editing={editing}
            onEditingChange={setEditing}
            onChange={onChange}
            onDeleted={onDeleted}
          />
        )}
        {widget.type === 'date' && (
          <DateWidget
            widget={widget}
            editing={editing}
            onEditingChange={setEditing}
            onChange={onChange}
            onDeleted={onDeleted}
          />
        )}
        {widget.type === 'image' && (
          <ImageWidget
            widget={widget}
            onChange={onChange}
            onDeleted={onDeleted}
            onOpen={onOpenImage}
          />
        )}
        {widget.type === 'link' && (
          <LinkWidget widget={widget} onChange={onChange} onDeleted={onDeleted} />
        )}
      </Card>
    </div>
  )
}