import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import CollectionCard from '../components/CollectionCard'
import { ApiError } from '../lib/api'
import {
  createCollection,
  deleteCollection,
  fetchUpcoming,
  searchCollections,
  setCollectionStatus,
  DEFAULT_FILTERS,
} from '../lib/collections'
import { STATUS_LABELS } from '../lib/collectionSchemas'
import type { Collection, CollectionStatus } from '../lib/collectionSchemas'

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent'
const buttonClass = 'rounded-md bg-accent px-4 py-2 font-heading text-bg disabled:opacity-50'

type Filter = 'all' | 'mine' | 'shared' | 'upcoming'
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Created by me' },
  { value: 'shared', label: 'Shared with me' },
  { value: 'upcoming', label: 'Upcoming' },
]

function StatusSelect({
  collection,
  onChanged,
}: {
  collection: Collection
  onChanged: (updated: Collection) => void
}) {
  // The server sends only the moves allowed right now, so an impossible one is
  // never offered.
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (collection.nextStatuses.length === 0) return null

  const move = async (status: CollectionStatus) => {
    setBusy(true)
    setError(null)
    try {
      onChanged(await setCollectionStatus(collection.id, status))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the status.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="text-right">
      <label className="sr-only" htmlFor={`status-${collection.id}`}>
        Status for {collection.title || 'this collection'}
      </label>
      <select
        id={`status-${collection.id}`}
        value={collection.status}
        disabled={busy}
        onChange={(event) => void move(event.target.value as CollectionStatus)}
        className="rounded-md border border-border bg-bg px-2 py-1 font-sans text-sm text-text outline-none focus-visible:border-accent"
      >
        <option value={collection.status}>{STATUS_LABELS[collection.status]}</option>
        {collection.nextStatuses.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      {error && (
        <span role="alert" className="mt-1 block max-w-56 text-xs text-accent">
          {error}
        </span>
      )}
    </span>
  )
}

function DeleteButton({
  collection,
  onDeleted,
}: {
  collection: Collection
  onDeleted: (id: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const remove = async () => {
    const name = collection.title || 'this collection'
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return

    setBusy(true)
    setError(null)
    try {
      await deleteCollection(collection.id)
      onDeleted(collection.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete it.')
      setBusy(false)
    }
  }

  return (
    <span className="text-right">
      <button
        type="button"
        onClick={() => void remove()}
        disabled={busy}
        className="rounded-md border border-border px-2 py-1 font-sans text-sm text-text disabled:opacity-50"
      >
        {busy ? 'Deleting…' : 'Delete'}
      </button>
      {error && (
        <span role="alert" className="mt-1 block max-w-56 text-xs text-accent">
          {error}
        </span>
      )}
    </span>
  )
}

export default function Collections() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('all')
  const [collections, setCollections] = useState<Collection[] | null>(null)
  // Which filter the list on screen belongs to. While these differ the list is
  // stale, so the page shows "Loading" instead of the old results.
  const [shownFilter, setShownFilter] = useState<Filter | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const loading = shownFilter !== filter

  useEffect(() => {
    let cancelled = false

    const run = async (which: Filter) => {
      try {
        const { collections: list } =
          which === 'upcoming'
            ? await fetchUpcoming(30, 12)
            : await searchCollections({ ...DEFAULT_FILTERS, scope: which })

        if (cancelled) return
        setCollections(list)
        setLoadError(null)
        setShownFilter(which)
      } catch (error) {
        if (cancelled) return
        setLoadError(
          error instanceof Error ? error.message : 'Could not load your collections.',
        )
        setCollections([])
        setShownFilter(which)
      }
    }

    void run(filter)
    return () => {
      cancelled = true
    }
  }, [filter])

  const replace = (updated: Collection) =>
    setCollections((current) =>
      current?.map((item) => (item.id === updated.id ? updated : item)) ?? current,
    )

  const drop = (id: string) =>
    setCollections((current) => current?.filter((item) => item.id !== id) ?? current)

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    setCreating(true)
    setCreateError(null)
    try {
      // A collection opens as "new", which the server keeps out of every list
      // until it holds something. So we go straight to it rather than showing
      // a card that would vanish on the next load.
      const created = await createCollection({ title: trimmed })
      navigate(`/collections/${created.id}`)
    } catch (error) {
      setCreateError(
        error instanceof ApiError ? error.message : 'Could not create it. Try again.',
      )
      setCreating(false)
    }
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="my-0!">Collections</h1>
        <Link to="/collections/new" className="text-accent underline">
          New collection
        </Link>
      </header>

      <form onSubmit={create} className="flex flex-wrap items-start gap-3">
        <div className="min-w-64 flex-1 space-y-1 text-left">
          <label htmlFor="new-collection" className="block font-heading text-text-h">
            Start a new collection
          </label>
          <input
            id="new-collection"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Weekend hike"
            maxLength={80}
            className={inputClass}
          />
        </div>
        <button type="submit" disabled={creating || !title.trim()} className={buttonClass}>
          {creating ? 'Creating…' : 'Create'}
        </button>
      </form>
      {createError && (
        <p role="alert" className="text-accent">
          {createError}
        </p>
      )}

      <nav aria-label="Filter collections" className="flex flex-wrap gap-2">
        {FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
            className={
              filter === value
                ? 'rounded-full bg-accent px-3 py-1 font-heading text-bg'
                : 'rounded-full border border-border px-3 py-1 font-heading text-text-h'
            }
          >
            {label}
          </button>
        ))}
      </nav>

      {loadError && (
        <p role="alert" className="text-accent">
          {loadError}
        </p>
      )}

      {loading || collections === null ? (
        <p role="status" className="text-text">
          Loading collections…
        </p>
      ) : collections.length === 0 ? (
        <p className="text-text">
          {filter === 'upcoming'
            ? 'Nothing coming up in the next 30 days.'
            : filter === 'shared'
              ? 'Nothing has been shared with you.'
              : filter === 'mine'
                ? 'You have not created any collections.'
                : 'No collections yet.'}{' '}
          {filter !== 'upcoming' && filter !== 'shared' && (
            <Link to="/collections/new" className="text-accent underline">
              Start one
            </Link>
          )}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {collections.map((collection) => (
            <li key={collection.id}>
              <CollectionCard
                collection={collection}
                action={
                  <StatusSelect collection={collection} onChanged={replace} />
                }
                footerAction={
                  collection.role === 'owner' ? (
                    <DeleteButton collection={collection} onDeleted={drop} />
                  ) : null
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
