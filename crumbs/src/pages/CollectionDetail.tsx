import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowUp } from '@untitledui/icons/ArrowUp'
import { ArrowDown } from '@untitledui/icons/ArrowDown'
import { ArrowLeft } from '@untitledui/icons/ArrowLeft'
import { ArrowRight } from '@untitledui/icons/ArrowRight'
import { AlignLeft } from '@untitledui/icons/AlignLeft'
import { Plus } from '@untitledui/icons/Plus'
import { Rows03 } from '@untitledui/icons/Rows03'
import { Trash01 } from '@untitledui/icons/Trash01'
import WidgetView from '../components/WidgetView'
import ImageViewer from '../components/ImageViewer'
import WidgetChooser from '../components/WidgetChooser'
import PeopleBar from '../components/PeopleBar'
import Select from '../components/Select'
import Fab, { FabAction } from '../components/Fab'
import Modal from '../components/Modal'
import { ApiError } from '../lib/api'
import {
  addRow,
  addWidget,
  deleteCollection,
  deleteRow,
  deleteWidget,
  reorderRows,
  reorderWidgets,
  fetchCollection,
  renameRow,
  setCollectionStatus,
  updateCollection,
} from '../lib/collections'
import { STATUS_LABELS } from '../lib/collectionSchemas'
import type {
  Collection,
  CollectionStatus,
  Widget,
  WidgetType,
} from '../lib/collectionSchemas'
import Button from '../components/Button'
import { ChipLabel } from '../components/Chip'
import { focusRing, pressable } from '../lib/ui'

const TAGS_MAX = 8
const TAG_MAX = 24

// The row's own add button, gone: adding a widget is now one action for the whole
// collection, taken from the button on the glass, so the strip is only the things
// that are already in it.

// Borderless until it is touched, then it takes a fill — the title reads as
// part of the page rather than as a field sitting on it.
const bareInput =
  'rounded-control border-2 border-transparent bg-transparent outline-none ' +
  'transition-colors duration-200 ease-ios hover:border-inactive focus-visible:border-inactive focus-visible:bg-surface'

// A row is a shelf of cards that runs off both edges, so the ends fade out
// instead of stopping at a hard edge. The cards touch and overlap rather than
// sitting in a gapped grid, which is what makes the row read as one pile of
// cards fanned out instead of as a set of separate boxes.
const STRIP =
  'flex items-center overflow-x-auto px-10 py-6 ' +
  '[-webkit-mask-image:linear-gradient(90deg,transparent_0,#000_44px,#000_calc(100%_-_44px),transparent_100%)] ' +
  '[mask-image:linear-gradient(90deg,transparent_0,#000_44px,#000_calc(100%_-_44px),transparent_100%)]'

// Each card is pulled left over its neighbour, so they overlap the way a hand of
// cards does. The hovered one is lifted above the rest, which is what keeps an
// overlapped card's controls reachable — hence `relative`, without which the
// z-index has nothing to sit on.
const FAN_OVERLAP = '-ml-9 hover:z-10'
const CARD_ITEM = 'relative w-[220px] shrink-0'

const WIDGET_LABELS: Record<WidgetType, string> = {
  notes: 'Notes',
  date: 'Date',
  image: 'Picture',
  link: 'Link',
}

// One small arrow control. Disabled at the end of the list it can move in.
function Nudge({
  direction,
  disabled,
  onClick,
  label,
}: {
  direction: 'up' | 'down' | 'left' | 'right'
  disabled: boolean
  onClick: () => void
  label: string
}) {
  const glyph = {
    up: <ArrowUp size={14} strokeWidth={1.75} />,
    down: <ArrowDown size={14} strokeWidth={1.75} />,
    left: <ArrowLeft size={14} strokeWidth={1.75} />,
    right: <ArrowRight size={14} strokeWidth={1.75} />,
  }[direction]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-7 place-items-center rounded-full bg-fill text-text disabled:opacity-30 ${focusRing} ${pressable}`}
    >
      {glyph}
    </button>
  )
}

function RowSection({
  collection,
  row,
  widgets,
  index,
  rowCount,
  onWidgetChanged,
  onWidgetDeleted,
  onWidgetsReordered,
  onRowChanged,
  onRowDeleted,
  onRowMoved,
}: {
  collection: Collection
  row: { id: string; name: string }
  widgets: Widget[]
  index: number
  rowCount: number
  onWidgetChanged: (next: Widget) => void
  onWidgetDeleted: (id: string) => void
  onWidgetsReordered: (widgets: Widget[]) => void
  onRowChanged: (next: Collection) => void
  onRowDeleted: (rowId: string) => void
  onRowMoved: (order: string[]) => void
}) {
  const [name, setName] = useState(row.name)
  const [error, setError] = useState<string | null>(null)
  // Which picture is full size, or null when none is. An index into this row's
  // pictures, so the arrows step through the row rather than the whole
  // collection.
  const [viewing, setViewing] = useState<number | null>(null)

  // This row's pictures, in row order, tagged with the widget they came from so a
// card can find its own place in the list.
  const pictures = widgets.flatMap((widget) =>
    widget.type === 'image' && widget.image
      ? [{ widgetId: widget.id, url: widget.image.url, name: widget.image.originalName }]
      : [],
  )

  // The index is a position in the pictures as they were when it was opened, so
  // it is remapped if the row changed underneath the viewer.
  const viewingIndex = (() => {
    if (viewing === null || viewing >= pictures.length) return null
    return viewing
  })()

  const rename = async () => {
    if (name === row.name) return
    try {
      onRowChanged(await renameRow(collection.id, row.id, name))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not rename the row.')
    }
  }

  const [movingRow, setMovingRow] = useState(false)
  const [movingWidget, setMovingWidget] = useState(false)

  // Both reorder endpoints insist on the COMPLETE list, every id once, so a move
  // rebuilds the whole array rather than sending just the pair that swapped.
  const moveRow = async (to: number) => {
    const ids = collection.rows.map((r) => r.id)
    if (to < 0 || to >= ids.length) return
    const from = ids.indexOf(row.id)
    if (from === -1 || from === to) return

    ids.splice(to, 0, ...ids.splice(from, 1))

    setMovingRow(true)
    setError(null)
    try {
      onRowMoved(ids)
    } finally {
      setMovingRow(false)
    }
  }

  const moveWidget = async (widgetId: string, to: number) => {
    // `widgets` is this row's widgets, already sorted by order.
    const ids = widgets.map((w) => w.id)
    if (to < 0 || to >= ids.length) return
    const from = ids.indexOf(widgetId)
    if (from === -1 || from === to) return

    ids.splice(to, 0, ...ids.splice(from, 1))

    setMovingWidget(true)
    setError(null)
    try {
      onWidgetsReordered(await reorderWidgets(collection.id, row.id, ids))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not move that.')
    } finally {
      setMovingWidget(false)
    }
  }

  return (
    <section className="space-y-1">
      <div className="flex items-center gap-2 px-2">
        <label className="sr-only" htmlFor={`row-${row.id}`}>
          Name for row {index + 1}
        </label>
        <input
          id={`row-${row.id}`}
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => void rename()}
          maxLength={40}
          placeholder={`Row ${index + 1}`}
          className={`${bareInput} min-w-0 flex-1 px-3 py-1.5 text-[18px] font-bold text-text-h placeholder:font-normal placeholder:text-inactive placeholder:normal-case`}
        />
        <span className="flex shrink-0 items-center gap-1">
          <Nudge
            direction="up"
            disabled={movingRow || index === 0}
            onClick={() => void moveRow(index - 1)}
            label={`Move row ${index + 1} up`}
          />
          <Nudge
            direction="down"
            disabled={movingRow || index === rowCount - 1}
            onClick={() => void moveRow(index + 1)}
            label={`Move row ${index + 1} down`}
          />
          <button
            type="button"
            onClick={() => onRowDeleted(row.id)}
            aria-label={`Delete row ${index + 1}`}
            title={`Delete row ${index + 1}`}
            className={`grid size-7 place-items-center rounded-full bg-fill text-danger disabled:opacity-30 ${focusRing} ${pressable}`}
          >
            <Trash01 size={14} strokeWidth={1.75} />
          </button>
        </span>
      </div>

      <ul className={STRIP}>
        {widgets.map((widget, position) => (
          <li
            key={widget.id}
            className={`${CARD_ITEM} ${position > 0 ? FAN_OVERLAP : 'hover:z-10'}`}
          >
            <WidgetView
              widget={widget}
              onChange={onWidgetChanged}
              onDeleted={() => onWidgetDeleted(widget.id)}
              onOpenImage={() =>
                setViewing(pictures.findIndex((p) => p.widgetId === widget.id))
              }
            />

            {widgets.length > 1 && (
              <div className="mt-1.5 flex justify-center gap-1">
                <Nudge
                  direction="left"
                  disabled={movingWidget || position === 0}
                  onClick={() => void moveWidget(widget.id, position - 1)}
                  label={`Move this ${WIDGET_LABELS[widget.type]} left`}
                />
                <Nudge
                  direction="right"
                  disabled={movingWidget || position === widgets.length - 1}
                  onClick={() => void moveWidget(widget.id, position + 1)}
                  label={`Move this ${WIDGET_LABELS[widget.type]} right`}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {error && (
        <p role="alert" className="px-2 text-[14px] text-danger">
          {error}
        </p>
      )}

      {pictures.length > 0 && (
        <ImageViewer
          images={pictures}
          index={viewingIndex}
          onIndexChange={setViewing}
          onClose={() => setViewing(null)}
          onDelete={() => {
            const picture = pictures[viewingIndex ?? -1]
            if (!picture) return
            setViewing(null)
            onWidgetDeleted(picture.widgetId)
          }}
        />
      )}
    </section>
  )
}

/**
 * The collection's tags, as removable pills. A tag is the one thing here that
 * can be taken off a card, so each one is a control rather than a label.
 */
function TagBar({
  collection,
  onChanged,
}: {
  collection: Collection
  onChanged: (next: Collection) => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = collection.role === 'owner'

  const save = async (tags: string[]) => {
    setBusy(true)
    setError(null)
    try {
      onChanged(await updateCollection(collection.id, { tags }))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the tags.')
    } finally {
      setBusy(false)
    }
  }

  const add = () => {
    const tag = text.trim().toLowerCase().replace(/^#/, '')
    if (!tag || busy) return
    if (collection.tags.includes(tag) || collection.tags.length >= TAGS_MAX) {
      setText('')
      return
    }
    setText('')
    void save([...collection.tags, tag])
  }

  const remove = (tag: string) => {
    if (busy) return
    void save(collection.tags.filter((item) => item !== tag))
  }

  if (collection.tags.length === 0 && !isOwner) return null

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        {collection.tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-surface py-1 pr-1 pl-3 text-[13px] text-text-h"
          >
            {tag}
            {isOwner && (
              <button
                type="button"
                onClick={() => remove(tag)}
                disabled={busy}
                aria-label={`Remove the tag ${tag}`}
                title={`Remove ${tag}`}
                className={`grid size-5 place-items-center rounded-full text-text hover:bg-fill hover:text-danger disabled:opacity-40 ${focusRing}`}
              >
                <Trash01 size={11} strokeWidth={1.75} />
              </button>
            )}
          </span>
        ))}

        {isOwner && (
          <>
            <label htmlFor={`tag-${collection.id}`} className="sr-only">
              Add a tag
            </label>
            <input
              id={`tag-${collection.id}`}
              value={text}
              onChange={(event) => setText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                add()
              }}
              maxLength={TAG_MAX}
              placeholder="+ Add a tag"
              className="w-36 rounded-full bg-surface px-3 py-1 text-[13px] text-text-h outline-none placeholder:text-inactive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <span className="text-[12px] text-text">
              {collection.tags.length}/{TAGS_MAX}
            </span>
          </>
        )}
      </div>

      {error && (
        <p role="alert" className="text-[13px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

/**
 * Which row a new widget goes in.
 *
 * Only asked when there is more than one row to ask about. Every row is listed
 * with what is already in it, because the answer is almost always "the one that
 * looks emptier" or "the one I just made", and neither is something you can work
 * out from a row name.
 */
function RowPicker({
  open,
  collection,
  counts,
  onPick,
  onClose,
}: {
  open: boolean
  collection: Collection
  counts: Record<string, number>
  onPick: (rowId: string) => void
  onClose: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title="Add to which row?" centered>
      <ul className="space-y-1">
        {collection.rows.map((row, index) => {
          const count = counts[row.id] ?? 0

          return (
            <li key={row.id}>
              <button
                type="button"
                onClick={() => onPick(row.id)}
                className={`flex w-full items-center gap-3 rounded-control p-3 text-left transition duration-200 ease-ios hover:bg-fill ${focusRing} ${pressable}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-text-h">
                    {row.name || `Row ${index + 1}`}
                  </span>
                  <span className="block text-[13px] text-text">
                    {count === 0 ? 'Empty' : count === 1 ? '1 card' : `${count} cards`}
                  </span>
                </span>
                <Plus size={18} strokeWidth={1.75} className="shrink-0 text-accent" />
              </button>
            </li>
          )
        })}
      </ul>
    </Modal>
  )
}

export default function CollectionDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [collection, setCollection] = useState<Collection | null>(null)
  const [widgets, setWidgets] = useState<Widget[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // The floating button opens into two actions, and each one is a question of its
  // own before it is an action: a widget needs a row to go in and a kind to be.
  const [menuOpen, setMenuOpen] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [choosing, setChoosing] = useState(false)
  const [addingWidget, setAddingWidget] = useState<WidgetType | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // ---- A blank collection is thrown away -------------------------------------
  //
  // Opening a collection from "New collection" lands here with nothing in it, so
  // leaving without putting anything in should leave nothing behind. The server
  // promotes a collection out of "new" the moment it gains a title, a tag or a
  // widget, so the status alone says whether anything was ever put here — there
  // is no need to track edits separately.
  const blank = useRef<string | null>(null)
  const discarded = useRef(false)
  const settled = useRef(false)

  const discard = (collectionId: string, keepalive = false) => {
    if (discarded.current) return
    discarded.current = true
    void deleteCollection(collectionId, keepalive).catch(() => undefined)
  }

  // Cleared the moment the collection stops being blank, so the cleanup below
  // finds nothing to throw away.
  useEffect(() => {
    if (collection && collection.status !== 'new') blank.current = null
  }, [collection])

  useEffect(() => {
    // StrictMode mounts, unmounts and mounts again in development. Treating the
    // first run as throwaway is what stops a collection being deleted the
    // instant this page renders.
    if (!settled.current) {
      settled.current = true
      return
    }
    return () => {
      if (blank.current) discard(blank.current)
    }
  }, [])

  // Closing the tab never unmounts React, so the same rule is applied on the way
  // out of the document. keepalive lets the request finish during the unload.
  useEffect(() => {
    const onPageHide = () => {
      if (blank.current) discard(blank.current, true)
    }
    window.addEventListener('pagehide', onPageHide)
    return () => window.removeEventListener('pagehide', onPageHide)
  }, [])

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const run = async () => {
      try {
        const { collection: found, widgets: foundWidgets } = await fetchCollection(id)
        if (cancelled) return
        // Still "new" means still empty, so this is a collection that should not
        // survive the visit if nothing gets put in it.
        blank.current = found.status === 'new' ? found.id : null
        setCollection(found)
        setWidgets(foundWidgets as Widget[])
        setTitle(found.title)
        setDescription(found.description)
        setLoadError(null)
      } catch (error) {
        if (cancelled) return
        setLoadError(
          error instanceof ApiError
            ? error.message
            : 'Could not load this collection.',
        )
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loadError) {
    return (
      <section className="mx-auto max-w-md space-y-4">
        <h1 className="text-[28px] font-semibold tracking-heading text-text-h">Collection</h1>
        <p role="alert" className="text-[15px] text-danger">
          {loadError}
        </p>
        <Link
          to="/collections"
          className="rounded text-accent underline underline-offset-4"
        >
          Back to collections
        </Link>
      </section>
    )
  }

  if (!collection) {
    return (
      <section>
        <p role="status" className="text-[15px] text-text">
          Loading…
        </p>
      </section>
    )
  }

  const saveDetails = async () => {
    if (title === collection.title && description === collection.description) return
    setSaveError(null)
    setSaved(false)
    try {
      setCollection(
        await updateCollection(collection.id, { title, description }),
      )
      setSaved(true)
    } catch (error) {
      setSaveError(
        error instanceof ApiError ? error.message : 'Could not save. Try again.',
      )
    }
  }

  const move = async (status: CollectionStatus) => {
    setSaveError(null)
    try {
      setCollection(await setCollectionStatus(collection.id, status))
    } catch (error) {
      setSaveError(
        error instanceof ApiError ? error.message : 'Could not change the status.',
      )
    }
  }

  // Deliberately not window.confirm: this is the only destructive thing on the
  // page, it cannot be undone, and a native dialog is the one surface in the app
  // that ignores the theme, the layout and the fact that the answer is on a
  // button rather than a keyboard shortcut.
  const remove = async () => {
    setDeleting(true)
    setSaveError(null)
    try {
      await deleteCollection(collection.id)
      navigate('/collections')
    } catch (error) {
      setSaveError(
        error instanceof ApiError ? error.message : 'Could not delete it.',
      )
      setConfirmingDelete(false)
    } finally {
      setDeleting(false)
    }
  }

  // A widget the server has just created arrives with an id that is not in the
  // list yet, so it has to be appended; an edit to one that is already there
  // replaces it in place. Without the append, a new widget only appeared after
  // a reload.
  const replaceWidget = (next: Widget) =>
    setWidgets((current) =>
      current.some((widget) => widget.id === next.id)
        ? current.map((widget) => (widget.id === next.id ? next : widget))
        : [...current, next],
    )

  const widgetsIn = (rowId: string) =>
    widgets
      .filter((widget) => widget.rowId === rowId)
      .sort((a, b) => a.order - b.order)

  // How full each row is, so the row picker can say which one is which without
  // having to look — a row of three cards and a row of one are told apart by
  // their name in most collections, and by nothing at all in the rest.
  const countsPerRow = Object.fromEntries(
    collection.rows.map((row) => [row.id, widgetsIn(row.id).length]),
  )

  const newRow = async () => {
    setMenuOpen(false)
    setAddError(null)
    try {
      setCollection((await addRow(collection.id)).collection)
    } catch (error) {
      setAddError(
        error instanceof ApiError ? error.message : 'Could not add a row.',
      )
    }
  }

  // Which row the widget goes in. One row leaves no question to ask, so the
  // chooser opens straight away; several do, so the row is picked first.
  const startWidget = () => {
    setMenuOpen(false)
    setAddError(null)
    if (collection.rows.length === 0) {
      setAddError('Add a row first — a widget goes inside one.')
      return
    }
    if (collection.rows.length === 1) {
      setAddingTo(collection.rows[0].id)
      return
    }
    setChoosing(true)
  }

  const addWidgetTo = async (type: WidgetType) => {
    if (!addingTo) return
    setAddingWidget(type)
    setAddError(null)
    try {
      const result = await addWidget(collection.id, addingTo, { type })
      replaceWidget(result.widget)
      // The collection comes back with it, and its status is what tells the page
      // this collection is no longer blank — so it has to be taken, not ignored.
      setCollection(result.collection)
      setAddingTo(null)
    } catch (error) {
      setAddError(error instanceof ApiError ? error.message : 'Could not add that.')
    } finally {
      setAddingWidget(null)
    }
  }

  return (
    <section className="space-y-4">
      {/* The title, and the people on it, are one band across the top: the title
          takes the width it needs and the faces sit against the right edge, so
          neither has to give ground to the other. On a narrow screen the faces
          drop below the title rather than squeezing it. */}
      <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 flex-1 space-y-3">
          <Link
            to="/collections"
            className="inline-block rounded text-[14px] text-accent underline underline-offset-4"
          >
            ← Collections
          </Link>

          {/* Title and description are one thing said twice, so they sit closer
              than anything else on the page — a single field's worth of space
              between them, not a section's. */}
          <div className="space-y-1">
            <label htmlFor="collection-title" className="sr-only">
              Collection title
            </label>
            <input
              id="collection-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={() => void saveDetails()}
              maxLength={80}
              placeholder="Untitled collection"
              className={`${bareInput} w-full px-3 py-1.5 text-[26px] font-bold tracking-heading text-text-h placeholder:font-semibold placeholder:text-inactive`}
            />

            <label htmlFor="collection-description" className="sr-only">
              Collection description
            </label>
            <textarea
              id="collection-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              onBlur={() => void saveDetails()}
              maxLength={500}
              rows={2}
              placeholder="Add a description (optional)"
              className={`${bareInput} w-full resize-none px-3 py-1.5 text-[15px] text-text placeholder:text-inactive`}
            />
          </div>

          <TagBar collection={collection} onChanged={setCollection} />

          {saved && (
            <p role="status" className="text-[14px] text-text">
              Saved.
            </p>
          )}

          {saveError && (
            <p role="alert" className="text-[15px] text-danger">
              {saveError}
            </p>
          )}
        </div>

        {/* The status, then the people: both are what this collection *is* right
            now rather than what is in it, so they sit together above the
            contents. The status is the dropdown only — the badge beside it said
            the same word the dropdown already had selected, and the state is
            worth changing from where it is read. */}
        <div className="pt-10 flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {collection.isOverdue && <ChipLabel tone="danger">Overdue</ChipLabel>}

            {collection.nextStatuses.length > 0 ? (
              <>
                <label htmlFor="detail-status" className="sr-only">
                  Change the status
                </label>
                <Select
                  id="detail-status"
                  value={collection.status}
                  onChange={(event) => void move(event.target.value as CollectionStatus)}
                >
                  <option value={collection.status}>
                    {STATUS_LABELS[collection.status]}
                  </option>
                  {collection.nextStatuses.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </Select>
              </>
            ) : (
              <span className="text-[14px] text-text">Add something to start it.</span>
            )}
          </div>

          <PeopleBar collection={collection} onChanged={setCollection} />
        </div>
      </header>

      <div className="space-y-8">
        <h2 className="text-[17px] font-semibold tracking-heading text-text-h">
          Contents
        </h2>

        {collection.rows.length === 0 && (
          <p className="text-[15px] text-text">
            No rows yet. Add one to start putting things in this collection.
          </p>
        )}

        {collection.rows.map((row, rowIndex) => (
          <RowSection
            key={row.id}
            collection={collection}
            row={row}
            widgets={widgetsIn(row.id)}
            index={rowIndex}
            rowCount={collection.rows.length}
            onWidgetChanged={replaceWidget}
            onWidgetsReordered={setWidgets}
            onRowMoved={(order) =>
              void reorderRows(collection.id, order)
                .then(setCollection)
                .catch(() => undefined)
            }
            onWidgetDeleted={(widgetId) =>
              void deleteWidget(widgetId).then(() =>
                setWidgets((current) =>
                  current.filter((widget) => widget.id !== widgetId),
                ),
              )
            }
            onRowChanged={setCollection}
            onRowDeleted={(rowId) =>
              void deleteRow(collection.id, rowId)
                .then(setCollection)
                .then(() =>
                  setWidgets((current) =>
                    current.filter((widget) => widget.rowId !== rowId),
                  ),
                )
            }
          />
        ))}
      </div>

      {collection.role === 'owner' && (
        <div className="pt-2">
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            <Trash01 size={16} strokeWidth={1.75} />
            Delete this collection
          </Button>
        </div>
      )}

      {/* Both ways of putting something in this collection, off one button. The
          two are a single decision — what am I adding? — so they are one menu
          rather than a row of controls spread down the page, and neither takes
          up a full-width band of dashed outline to sit there doing nothing. */}
      <Fab
        label="Add to this collection"
        onClick={() => setMenuOpen((open) => !open)}
        expanded={menuOpen}
      >
        {menuOpen && (
          <>
            <FabAction label="Add a widget" onClick={startWidget}>
              <AlignLeft size={18} strokeWidth={1.75} />
            </FabAction>
            <FabAction label="Add a row" onClick={() => void newRow()}>
              <Rows03 size={18} strokeWidth={1.75} />
            </FabAction>
          </>
        )}
      </Fab>

      <Modal
        open={confirmingDelete}
        onClose={() => (deleting ? undefined : setConfirmingDelete(false))}
        title="Delete this collection?"
      >
        <div className="space-y-4 flex flex-col gap-6">
          <p className="text-[15px] text-text">
            <strong className="font-medium text-text-h">
              {collection.title || 'Untitled collection'}
            </strong>{' '}
            and everything in it will be gone. This cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
            >
              Keep it
            </Button>
            <Button
              variant="danger"
              onClick={() => void remove()}
              disabled={deleting}
            >
              <Trash01 size={16} strokeWidth={1.75} />
              {deleting ? 'Deleting…' : 'Delete it'}
            </Button>
          </div>
        </div>
      </Modal>

      <RowPicker
        open={choosing}
        collection={collection}
        counts={countsPerRow}
        onPick={(rowId) => {
          setChoosing(false)
          setAddingTo(rowId)
        }}
        onClose={() => setChoosing(false)}
      />

      <WidgetChooser
        open={addingTo !== null}
        busy={addingWidget}
        onChoose={(type) => void addWidgetTo(type)}
        onClose={() => setAddingTo(null)}
      />

      {addError && (
        <p role="alert" className="fixed right-5 bottom-[10.5rem] z-20 max-w-[16rem] rounded-control bg-surface px-4 py-3 text-[14px] text-danger shadow-float lg:right-8 lg:bottom-28">
          {addError}
        </p>
      )}
    </section>
  )
}