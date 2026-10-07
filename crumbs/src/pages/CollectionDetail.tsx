import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import WidgetView from '../components/WidgetView'
import { ApiError } from '../lib/api'
import { fetchFriends } from '../lib/friends'
import { profilePath } from '../lib/people'
import { fullName } from '../lib/user'
import type { Friend } from '../lib/schemas'
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
  shareCollection,
  unshareCollection,
  updateCollection,
} from '../lib/collections'
import { STATUS_LABELS, WIDGET_TYPES } from '../lib/collectionSchemas'
import type {
  Collection,
  CollectionStatus,
  Widget,
  WidgetType,
} from '../lib/collectionSchemas'

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent'
const labelClass = 'block font-heading text-text-h'
const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

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
  const glyph = { up: '\u2191', down: '\u2193', left: '\u2190', right: '\u2192' }[direction]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`grid size-6 place-items-center rounded border border-border text-sm leading-none text-text hover:bg-accent-bg disabled:opacity-30 ${focusRing}`}
    >
      <span aria-hidden="true">{glyph}</span>
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
  const [adding, setAdding] = useState<WidgetType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rename = async () => {
    if (name === row.name) return
    try {
      onRowChanged(await renameRow(collection.id, row.id, name))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not rename the row.')
    }
  }

  const add = async (type: WidgetType) => {
    setAdding(type)
    setError(null)
    try {
      const result = await addWidget(collection.id, row.id, { type })
      onWidgetChanged(result.widget)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add that.')
    } finally {
      setAdding(null)
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
    <section className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={`row-${row.id}`} className={labelClass}>
          Row {index + 1} of {rowCount}
        </label>
        <span className="flex items-center gap-1">
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
            className="ml-1 rounded-md border border-border px-2 py-1 text-xs text-text hover:bg-accent-bg"
          >
            Delete row
          </button>
        </span>
      </div>

      <input
        id={`row-${row.id}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => void rename()}
        maxLength={40}
        placeholder="Name this row (optional)"
        className={inputClass}
      />

      {widgets.length === 0 ? (
        <p className="text-sm text-text">Nothing in this row yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {widgets.map((widget, position) => (
            <li key={widget.id}>
              {widgets.length > 1 && (
                <div className="mb-1 flex justify-end gap-1">
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
              <WidgetView
                widget={widget}
                onChange={onWidgetChanged}
                onDeleted={() => onWidgetDeleted(widget.id)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        {WIDGET_TYPES.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => void add(type)}
            disabled={adding !== null}
            className={`rounded-md border border-border px-3 py-1 font-sans text-sm text-text disabled:opacity-50 ${focusRing}`}
          >
            {adding === type ? 'Adding…' : `+ ${WIDGET_LABELS[type]}`}
          </button>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </section>
  )
}

function ShareForm({
  collection,
  onChanged,
}: {
  collection: Collection
  onChanged: (next: Collection) => void
}) {
  const [friends, setFriends] = useState<Friend[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchFriends()
      .then((list) => {
        if (!cancelled) setFriends(list)
      })
      .catch(() => {
        if (!cancelled) setFriends([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The server only lets you share with people on your friends list.
  const already = new Set([
    collection.owner.id,
    ...collection.collaborators.map((person) => person.id),
  ])
  const candidates = (friends ?? []).filter((friend) => !already.has(friend.id))

  const add = async (userId: string) => {
    setBusy(true)
    setError(null)
    try {
      onChanged(await shareCollection(collection.id, userId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not share it with them.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {friends === null ? (
        <p className="text-sm text-text">Loading your friends…</p>
      ) : candidates.length === 0 ? (
        <p className="text-sm text-text">
          {friends.length === 0
            ? 'You have no friends yet.'
            : 'Everyone on your friends list is already on this collection.'}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {candidates.map((friend) => (
            <li key={friend.id}>
              <button
                type="button"
                onClick={() => void add(friend.id)}
                disabled={busy}
                className={`rounded-md border border-border px-2 py-1 text-xs text-text disabled:opacity-50 ${focusRing}`}
              >
                + {friend.firstName || friend.lastName ? fullName(friend) : friend.username}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
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

  useEffect(() => {
    if (!id) return
    let cancelled = false

    const run = async () => {
      try {
        const { collection: found, widgets: foundWidgets } = await fetchCollection(id)
        if (cancelled) return
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
      <section className="space-y-4">
        <h1 className="my-0!">Collection</h1>
        <p role="alert" className="text-accent">
          {loadError}
        </p>
        <Link to="/collections" className="text-accent underline">
          Back to collections
        </Link>
      </section>
    )
  }

  if (!collection) {
    return (
      <section>
        <p role="status" className="text-text">
          Loading…
        </p>
      </section>
    )
  }

  const saveDetails = async () => {
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

  const remove = async () => {
    if (!window.confirm('Delete this collection and everything in it?')) return
    try {
      await deleteCollection(collection.id)
      navigate('/collections')
    } catch (error) {
      setSaveError(
        error instanceof ApiError ? error.message : 'Could not delete it.',
      )
    }
  }

  const replaceWidget = (next: Widget) =>
    setWidgets((current) =>
      current.map((widget) => (widget.id === next.id ? next : widget)),
    )

  const widgetsIn = (rowId: string) =>
    widgets
      .filter((widget) => widget.rowId === rowId)
      .sort((a, b) => a.order - b.order)

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <Link to="/collections" className="text-sm text-accent underline">
          Collections
        </Link>
        <h1 className="my-0!">{collection.title || 'Untitled collection'}</h1>
      </header>

      <div className="space-y-4 rounded-lg border border-border p-4 text-left">
        <div className="space-y-1">
          <label htmlFor="detail-title" className={labelClass}>
            Title
          </label>
          <input
            id="detail-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={80}
            className={inputClass}
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="detail-description" className={labelClass}>
            Description
          </label>
          <textarea
            id="detail-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={() => void saveDetails()}
            maxLength={500}
            rows={3}
            className={`${inputClass} resize-y`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {collection.nextStatuses.length > 0 ? (
            <>
              <label htmlFor="detail-status" className={labelClass}>
                Status
              </label>
              <select
                id="detail-status"
                value={collection.status}
                onChange={(event) => void move(event.target.value as CollectionStatus)}
                className={inputClass}
              >
                <option value={collection.status}>
                  {STATUS_LABELS[collection.status]}
                </option>
                {collection.nextStatuses.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <p className="text-sm text-text">Add something and it becomes a draft.</p>
          )}

          {saved && (
            <span role="status" className="text-sm text-text">
              Saved.
            </span>
          )}
        </div>

        {saveError && (
          <p role="alert" className="text-sm text-accent">
            {saveError}
          </p>
        )}
      </div>

      <section className="space-y-3 text-left">
        <h2 className="text-xl">People</h2>
        <p className="text-sm text-text">
          Created by{' '}
          <Link to={profilePath(collection.owner.username)} className="text-accent underline">
            {collection.owner.username ?? 'someone'}
          </Link>
          .{' '}
          {collection.collaborators.length > 0 && 'Shared with '}
          {collection.collaborators.map((person, index) => (
            <span key={person.id}>
              {index > 0 && ', '}
              <Link to={profilePath(person.username)} className="text-accent underline">
                {person.username}
              </Link>
            </span>
          ))}
          {collection.collaborators.length > 0 && '.'}
        </p>

        {collection.role === 'owner' && collection.collaborators.length > 0 && (
          <ul className="flex flex-wrap gap-2">
            {collection.collaborators.map((person) => (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() =>
                    void unshareCollection(collection.id, person.id).then(setCollection)
                  }
                  className="rounded-md border border-border px-2 py-1 text-xs text-text hover:bg-accent-bg"
                >
                  Remove {person.username} ×
                </button>
              </li>
            ))}
          </ul>
        )}

        {collection.role === 'owner' && (
          <ShareForm collection={collection} onChanged={setCollection} />
        )}
      </section>

      <div className="space-y-4 text-left">
        <h2 className="text-xl">Contents</h2>
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

        <button
          type="button"
          onClick={() =>
            void addRow(collection.id).then((result) => setCollection(result.collection))
          }
          className={`rounded-md border border-border px-3 py-2 font-heading text-text-h ${focusRing}`}
        >
          + Add a row
        </button>
      </div>

      {collection.role === 'owner' && (
        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => void remove()}
            className="rounded-md border border-border px-3 py-2 font-heading text-text-h"
          >
            Delete this collection
          </button>
        </div>
      )}
    </section>
  )
}
