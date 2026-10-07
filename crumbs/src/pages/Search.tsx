import { useCallback, useEffect, useRef, useState } from 'react'
import CollectionCard from '../components/CollectionCard'
import PersonRow from '../components/PersonRow'
import { ApiError } from '../lib/api'
import { DEFAULT_FILTERS, searchCollections } from '../lib/collections'
import { searchPeople } from '../lib/people'
import type { SearchHit } from '../lib/people'
import {
  COLLECTION_STATUSES,
  SCOPES,
  SORT_OPTIONS,
  STATUS_LABELS,
  WIDGET_TYPES,
} from '../lib/collectionSchemas'
import type {
  Collection,
  Pagination,
  Scope,
  SearchFilters,
  Sort,
  WidgetType,
} from '../lib/collectionSchemas'

const inputClass =
  'w-full rounded-md border border-border bg-bg px-3 py-2 font-sans text-text outline-none focus-visible:border-accent'
const labelClass = 'block font-heading text-text-h'
const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const SCOPE_LABELS: Record<Scope, string> = {
  all: 'Everything',
  mine: 'Created by me',
  shared: 'Shared with me',
}

const SORT_LABELS: Record<Sort, string> = {
  recent: 'Recently edited',
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title A–Z',
  date_asc: 'Date, soonest first',
  date_desc: 'Date, latest first',
}

const HAS_LABELS: Record<WidgetType, string> = {
  notes: 'Notes',
  image: 'A picture',
  date: 'A date',
  link: 'A link',
}

// People are looked up by username, and the server refuses anything outside
// 2-20 characters (validators/friends.js). So the people request is only made
// inside that window: never on an empty box, and never on a long phrase, which
// would come back a 400.
const PEOPLE_MIN = 2
const PEOPLE_MAX = 20

// A checkbox list. Toggling one keeps the others as they are.
function Toggles<T extends string>({
  legend,
  options,
  selected,
  onChange,
  labels,
}: {
  legend: string
  options: readonly T[]
  selected: T[]
  onChange: (next: T[]) => void
  labels?: Partial<Record<T, string>>
}) {
  const toggle = (value: T) =>
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    )

  return (
    <fieldset className="space-y-2 text-left">
      <legend className={labelClass}>{legend}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {options.map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={selected.includes(option)}
              onChange={() => toggle(option)}
              className="size-4 accent-[var(--accent)]"
            />
            {labels?.[option] ?? option}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function Search() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [results, setResults] = useState<Collection[] | null>(null)
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [people, setPeople] = useState<SearchHit[]>([])
  const [collectionError, setCollectionError] = useState<string | null>(null)
  const [peopleError, setPeopleError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // Both requests fire per search, so responses can arrive out of order. Only
  // the newest run is allowed to write state.
  const runId = useRef(0)

  const run = useCallback(async (next: SearchFilters) => {
    const id = ++runId.current
    const term = next.q.trim()
    const lookForPeople = term.length >= PEOPLE_MIN && term.length <= PEOPLE_MAX

    setBusy(true)

    // Settled separately: a failing people search must not blank out the
    // collections, and the other way round.
    const [collectionsOutcome, peopleOutcome] = await Promise.allSettled([
      searchCollections(next),
      lookForPeople ? searchPeople(term) : Promise.resolve([] as SearchHit[]),
    ])

    // A newer search has started; this one's answers are stale.
    if (runId.current !== id) return

    if (collectionsOutcome.status === 'fulfilled') {
      setResults(collectionsOutcome.value.collections)
      setPagination(collectionsOutcome.value.pagination)
      setCollectionError(null)
    } else {
      const err = collectionsOutcome.reason
      setCollectionError(
        err instanceof ApiError ? err.message : 'Could not search collections.',
      )
      setResults([])
      setPagination(null)
    }

    if (lookForPeople) {
      if (peopleOutcome.status === 'fulfilled') {
        setPeople(peopleOutcome.value)
        setPeopleError(null)
      } else {
        const err = peopleOutcome.reason
        setPeopleError(
          err instanceof ApiError ? err.message : 'Could not search people.',
        )
        setPeople([])
      }
    } else {
      setPeople([])
      setPeopleError(null)
    }

    setBusy(false)
  }, [])

  // Debounced, so typing does not fire two requests per keystroke.
  useEffect(() => {
    const handle = setTimeout(() => void run(filters), filters.q ? 300 : 0)
    return () => clearTimeout(handle)
  }, [filters, run])

  const set = <K extends keyof SearchFilters>(key: K, value: SearchFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }))

  const goToPage = (page: number) => setFilters((current) => ({ ...current, page }))

  const term = filters.q.trim()
  const peopleRequested = term.length >= PEOPLE_MIN && term.length <= PEOPLE_MAX
  const activeFilterCount =
    (filters.scope !== 'all' ? 1 : 0) +
    filters.status.length +
    filters.has.length +
    (filters.sort !== 'recent' ? 1 : 0)

  return (
    <section className="space-y-6">
      <h1 className="my-0!">Search</h1>

      {/* One box for everything. Collections search every word in a collection;
          people search usernames. Both run off this same query. */}
      <div className="space-y-1 text-left">
        <label htmlFor="search-q" className={labelClass}>
          Search collections and people
        </label>
        <input
          id="search-q"
          type="search"
          value={filters.q}
          onChange={(event) => set('q', event.target.value)}
          placeholder="trip budget, or a username"
          autoComplete="off"
          className={inputClass}
        />
        <p className="text-xs text-text">
          {peopleRequested
            ? 'Every word must appear in a collection. People are matched on username.'
            : term.length > PEOPLE_MAX
              ? `Usernames are at most ${PEOPLE_MAX} characters, so only collections are searched.`
              : `Leave this empty to browse collections. Type ${PEOPLE_MIN} or more characters to find people.`}
        </p>
      </div>

      {/* These narrow the collections half only, which is why they are tucked
          away and labelled as such. */}
      <details className="rounded-lg border border-border text-left">
        <summary className={`cursor-pointer px-4 py-3 font-heading text-text-h ${focusRing}`}>
          Filters for collections
          {activeFilterCount > 0 && (
            <span className="ml-2 text-sm text-text">({activeFilterCount} on)</span>
          )}
        </summary>

        <div className="space-y-4 border-t border-border p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="search-scope" className={labelClass}>
                Whose
              </label>
              <select
                id="search-scope"
                value={filters.scope}
                onChange={(event) => set('scope', event.target.value as Scope)}
                className={inputClass}
              >
                {SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {SCOPE_LABELS[scope]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="search-sort" className={labelClass}>
                Sort by
              </label>
              <select
                id="search-sort"
                value={filters.sort}
                onChange={(event) => set('sort', event.target.value as Sort)}
                className={inputClass}
              >
                {SORT_OPTIONS.map((sort) => (
                  <option key={sort} value={sort}>
                    {SORT_LABELS[sort]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Toggles
            legend="Status"
            options={COLLECTION_STATUSES.filter((status) => status !== 'new')}
            selected={filters.status}
            onChange={(next) => set('status', next)}
            labels={STATUS_LABELS}
          />

          <Toggles
            legend="Contains"
            options={WIDGET_TYPES}
            selected={filters.has}
            onChange={(next) => set('has', next)}
            labels={HAS_LABELS}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className={`rounded-md border border-border px-4 py-2 font-heading text-text-h ${focusRing}`}
            >
              Clear filters
            </button>
          </div>
        </div>
      </details>

      {busy && (
        <p role="status" className="text-text">
          Searching…
        </p>
      )}

      {collectionError && (
        <p role="alert" className="text-accent">
          {collectionError}
        </p>
      )}

      <section aria-labelledby="collections-results" className="space-y-3">
        <h2 id="collections-results" className="text-xl">
          {pagination
            ? `Collections (${pagination.total})`
            : results === null
              ? 'Collections'
              : `Collections (${results.length})`}
        </h2>

        {results === null ? (
          <p className="text-text">Loading…</p>
        ) : results.length === 0 ? (
          <p className="text-text">
            {term
              ? 'No collections matched.'
              : 'No collections yet. Start one from the Collections page.'}
          </p>
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2">
              {results.map((collection) => (
                <li key={collection.id}>
                  <CollectionCard collection={collection} />
                </li>
              ))}
            </ul>

            {pagination && pagination.totalPages > 1 && (
              <nav aria-label="Collection pages" className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className={`rounded-md border border-border px-3 py-1 font-heading text-text-h disabled:opacity-50 ${focusRing}`}
                >
                  Previous
                </button>
                <span className="text-sm text-text">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className={`rounded-md border border-border px-3 py-1 font-heading text-text-h disabled:opacity-50 ${focusRing}`}
                >
                  Next
                </button>
              </nav>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="people-results" className="space-y-3">
        <h2 id="people-results" className="text-xl">
          {peopleRequested ? `People (${people.length})` : 'People'}
        </h2>

        {peopleError && (
          <p role="alert" className="text-accent">
            {peopleError}
          </p>
        )}

        {!peopleRequested ? (
          <p className="text-text">
            Type at least {PEOPLE_MIN} characters to look for people by username.
          </p>
        ) : people.length === 0 ? (
          <p className="text-text">No one with that username.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {people.map((hit) => (
              <PersonRow key={hit.id} hit={hit} />
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
