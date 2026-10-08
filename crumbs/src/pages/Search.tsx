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
import Button from '../components/Button'
import Card from '../components/Card'
import Chip from '../components/Chip'
import Field from '../components/Field'
import { focusRing } from '../lib/ui'

const selectClass =
  'w-full rounded-control bg-fill px-4 py-2.5 text-[15px] text-text-h outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

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

  // Chips rather than checkboxes: these are the same kind of choice the
  // Collections page already makes with pills, and the selected state reads at
  // a glance from the accent tint.
  return (
    <fieldset className="space-y-2">
      <legend className="text-[13px] font-medium text-text-h">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip
            key={option}
            selected={selected.includes(option)}
            onClick={() => toggle(option)}
          >
            {labels?.[option] ?? option}
          </Chip>
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
      <h1 className="text-[28px] font-semibold tracking-heading text-text-h">Search</h1>

      {/* One box for everything. Collections search every word in a collection;
          people search usernames. Both run off this same query. */}
      <div className="text-left">
        <Field
          label="Search collections and people"
          type="search"
          value={filters.q}
          onChange={(event) => set('q', event.target.value)}
          placeholder="trip budget, or a username"
          autoComplete="off"
        />
        <p className="mt-1.5 text-[13px] text-text">
          {peopleRequested
            ? 'Every word must appear in a collection. People are matched on username.'
            : term.length > PEOPLE_MAX
              ? `Usernames are at most ${PEOPLE_MAX} characters, so only collections are searched.`
              : `Leave this empty to browse collections. Type ${PEOPLE_MIN} or more characters to find people.`}
        </p>
      </div>

      {/* These narrow the collections half only, which is why they are tucked
          away and labelled as such. */}
      <Card className="p-0">
        <details>
        <summary
          className={`cursor-pointer px-5 py-4 text-[15px] font-medium text-text-h ${focusRing}`}
        >
          Filters for collections
          {activeFilterCount > 0 && (
            <span className="ml-2 text-[14px] text-text">({activeFilterCount} on)</span>
          )}
        </summary>

        <div className="space-y-4 px-5 pb-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="search-scope" className="text-[13px] font-medium text-text-h">
                Whose
              </label>
              <select
                id="search-scope"
                value={filters.scope}
                onChange={(event) => set('scope', event.target.value as Scope)}
                className={selectClass}
              >
                {SCOPES.map((scope) => (
                  <option key={scope} value={scope}>
                    {SCOPE_LABELS[scope]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="search-sort" className="text-[13px] font-medium text-text-h">
                Sort by
              </label>
              <select
                id="search-sort"
                value={filters.sort}
                onChange={(event) => set('sort', event.target.value as Sort)}
                className={selectClass}
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
            <Button
              variant="secondary"
              onClick={() => setFilters(DEFAULT_FILTERS)}
            >
              Clear filters
            </Button>
          </div>
        </div>
        </details>
      </Card>

      {busy && (
        <p role="status" className="text-[15px] text-text">
          Searching…
        </p>
      )}

      {collectionError && (
        <p role="alert" className="text-[15px] text-danger">
          {collectionError}
        </p>
      )}

      <section aria-labelledby="collections-results" className="space-y-3">
        <h2 id="collections-results" className="text-[17px] font-semibold tracking-heading text-text-h">
          {pagination
            ? `Collections (${pagination.total})`
            : results === null
              ? 'Collections'
              : `Collections (${results.length})`}
        </h2>

        {results === null ? (
          <p className="text-[15px] text-text">Loading…</p>
        ) : results.length === 0 ? (
          <p className="text-[15px] text-text">
            {term
              ? 'No collections matched.'
              : 'No collections yet. Start one from the Collections page.'}
          </p>
        ) : (
          <>
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((collection) => (
                <li key={collection.id}>
                  <CollectionCard collection={collection} />
                </li>
              ))}
            </ul>

            {pagination && pagination.totalPages > 1 && (
              <nav aria-label="Collection pages" className="flex items-center justify-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-[14px] text-text">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </Button>
              </nav>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="people-results" className="space-y-3">
        <h2 id="people-results" className="text-[17px] font-semibold tracking-heading text-text-h">
          {peopleRequested ? `People (${people.length})` : 'People'}
        </h2>

        {peopleError && (
          <p role="alert" className="text-[15px] text-danger">
            {peopleError}
          </p>
        )}

        {!peopleRequested ? (
          <p className="text-[15px] text-text">
            Type at least {PEOPLE_MIN} characters to look for people by username.
          </p>
        ) : people.length === 0 ? (
          <p className="text-[15px] text-text">No one with that username.</p>
        ) : (
          <Card className="p-0">
            <ul>
              {people.map((hit) => (
                <PersonRow key={hit.id} hit={hit} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </section>
  )
}
