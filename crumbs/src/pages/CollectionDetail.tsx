import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowUp } from '@untitledui/icons/ArrowUp'
import { ArrowDown } from '@untitledui/icons/ArrowDown'
import { ArrowLeft } from '@untitledui/icons/ArrowLeft'
import { ArrowRight } from '@untitledui/icons/ArrowRight'
import { Plus } from '@untitledui/icons/Plus'
import { Trash01 } from '@untitledui/icons/Trash01'
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
import Button from '../components/Button'
import Card from '../components/Card'
import Chip, { ChipLabel } from '../components/Chip'
import Field from '../components/Field'
import { focusRing, pressable } from '../lib/ui'

const selectClass =
  'rounded-control bg-fill px-3 py-2 text-[15px] text-text-h outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

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
    <Card as="section" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] font-medium text-text-h">
          Row {index + 1} of {rowCount}
        </span>
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
          <Button
            variant="danger"
            size="sm"
            onClick={() => onRowDeleted(row.id)}
            className="ml-1"
          >
            Delete row
          </Button>
        </span>
      </div>

      <input
        id={`row-${row.id}`}
        aria-label={`Name for row ${index + 1}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={() => void rename()}
        maxLength={40}
        placeholder="Name this row (optional)"
        className={`w-full rounded-control bg-fill px-4 py-2.5 text-[15px] text-text-h placeholder:text-inactive outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent`}
      />

      {widgets.length === 0 ? (
        <p className="text-[15px] text-text">Nothing in this row yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
          <Chip key={type} disabled={adding !== null} onClick={() => void add(type)}>
            <Plus size={14} strokeWidth={1.75} />
            {adding === type ? 'Adding…' : WIDGET_LABELS[type]}
          </Chip>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-[15px] text-danger">
          {error}
        </p>
      )}
    </Card>
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
        <p className="text-[15px] text-text">Loading your friends…</p>
      ) : candidates.length === 0 ? (
        <p className="text-[15px] text-text">
          {friends.length === 0
            ? 'You have no friends yet.'
            : 'Everyone on your friends list is already on this collection.'}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {candidates.map((friend) => (
            <li key={friend.id}>
              <Chip disabled={busy} onClick={() => void add(friend.id)}>
                <Plus size={14} strokeWidth={1.75} />
                {friend.firstName || friend.lastName ? fullName(friend) : friend.username}
              </Chip>
            </li>
          ))}
        </ul>
      )}
      {error && (
        <p role="alert" className="text-[15px] text-danger">
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
        <Link
          to="/collections"
          className="inline-block rounded text-[14px] text-accent underline underline-offset-4"
        >
          Collections
        </Link>
        <h1 className="text-[28px] font-semibold tracking-heading text-text-h">
          {collection.title || 'Untitled collection'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <ChipLabel tone="accent">{STATUS_LABELS[collection.status]}</ChipLabel>
          {collection.isOverdue && <ChipLabel tone="danger">Overdue</ChipLabel>}
        </div>
      </header>

      <Card className="space-y-4">
        <Field
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={80}
        />

        <Field
          label="Description"
          as="textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          onBlur={() => void saveDetails()}
          maxLength={500}
          rows={3}
        />

        <div className="flex flex-wrap items-center gap-3">
          {collection.nextStatuses.length > 0 ? (
            <>
              <label htmlFor="detail-status" className="text-[13px] font-medium text-text-h">
                Status
              </label>
              <select
                id="detail-status"
                value={collection.status}
                onChange={(event) => void move(event.target.value as CollectionStatus)}
                className={selectClass}
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
            <p className="text-[15px] text-text">Add something and it becomes a draft.</p>
          )}

          {saved && (
            <span role="status" className="text-[14px] text-text">
              Saved.
            </span>
          )}
        </div>

        {saveError && (
          <p role="alert" className="text-[15px] text-danger">
            {saveError}
          </p>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="text-[17px] font-semibold tracking-heading text-text-h">People</h2>
        <p className="text-[15px] text-text">
          Created by{' '}
          <Link
            to={profilePath(collection.owner.username)}
            className="rounded text-accent underline underline-offset-4"
          >
            {collection.owner.username ?? 'someone'}
          </Link>
          .{' '}
          {collection.collaborators.length > 0 && 'Shared with '}
          {collection.collaborators.map((person, index) => (
            <span key={person.id}>
              {index > 0 && ', '}
              <Link
                to={profilePath(person.username)}
                className="rounded text-accent underline underline-offset-4"
              >
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    void unshareCollection(collection.id, person.id).then(setCollection)
                  }
                >
                  Remove {person.username}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {collection.role === 'owner' && (
          <ShareForm collection={collection} onChanged={setCollection} />
        )}
      </section>

      <div className="space-y-4">
        <h2 className="text-[17px] font-semibold tracking-heading text-text-h">
          Contents
        </h2>
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

        <Button
          variant="secondary"
          onClick={() =>
            void addRow(collection.id).then((result) => setCollection(result.collection))
          }
        >
          <Plus size={16} strokeWidth={1.75} />
          Add a row
        </Button>
      </div>

      {collection.role === 'owner' && (
        <div className="pt-2">
          <Button variant="danger" onClick={() => void remove()}>
            <Trash01 size={16} strokeWidth={1.75} />
            Delete this collection
          </Button>
        </div>
      )}
    </section>
  )
}
