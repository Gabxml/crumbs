import { useCallback, useEffect, useRef, useState } from 'react'
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
import FolderCard from '../components/FolderCard'
import Select from '../components/Select'
import PersonRow from '../components/PersonRow'
import { focusRing } from '../lib/ui'

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

// Pages through a result set. Nothing at all for a single page: two dead buttons
// under one row of results is furniture, not navigation.
function Pager({
  pagination,
  disabled,
  onPage,
}: {
  pagination: Pagination
  /** A search is already running, so a second tap would queue another one. */
  disabled: boolean
  onPage: (page: number) => void
}) {
  if (pagination.totalPages <= 1) return null

  return (
    <nav
      aria-label="Collections results pages"
      className="flex items-center justify-between gap-3 border-t border-inactive pt-4"
    >
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || pagination.page <= 1}
        onClick={() => onPage(pagination.page - 1)}
      >
        Previous
      </Button>

      <span className="text-[14px] text-text">
        Page {pagination.page} of {pagination.totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={disabled || pagination.page >= pagination.totalPages}
        onClick={() => onPage(pagination.page + 1)}
      >
        Next
      </Button>
    </nav>
  )
}

export default function Search() {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  // What the last completed search found. Null until one has, so a page that has
  // never searched does not read as a search that found nothing.
  const [results, setResults] = useState<{
    collections: Collection[]
    pagination: Pagination
  } | null>(null)
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
    // A message from the previous search would otherwise sit on screen next to
    // "Searching…" and be read as the answer to this one.
    setCollectionError(null)
    setPeopleError(null)

    // Settled separately: a failing people search must not be reported as a
    // failed collection search, and the other way round.
    const [collectionsOutcome, peopleOutcome] = await Promise.allSettled([
      searchCollections(next),
      lookForPeople ? searchPeople(term) : Promise.resolve([] as SearchHit[]),
    ])

    // A newer search has started; this one's answers are stale.
    if (runId.current !== id) return

    if (collectionsOutcome.status === 'fulfilled') {
      setResults(collectionsOutcome.value)
    } else {
      setResults(null)
      const err = collectionsOutcome.reason
      setCollectionError(
        err instanceof ApiError ? err.message : 'Could not search collections.',
      )
    }

    if (lookForPeople) {
      if (peopleOutcome.status === 'fulfilled') {
        setPeople(peopleOutcome.value)
      } else {
        setPeople([])
        const err = peopleOutcome.reason
        setPeopleError(
          err instanceof ApiError ? err.message : 'Could not search people.',
        )
      }
    } else {
      // Out of the 2-20 character window there is no people request at all, so
      // the last one's hits have to go or they linger under a box they no longer
      // answer.
      setPeople([])
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

  const term = filters.q.trim()
  const peopleRequested = term.length >= PEOPLE_MIN && term.length <= PEOPLE_MAX
  // What the Filters pill is counting. Sort is in here because it is the one
  // narrowing that has no chip of its own to show it.
  const activeFilterCount =
    (filters.scope !== 'all' ? 1 : 0) +
    filters.status.length +
    filters.has.length +
    (filters.sort !== 'recent' ? 1 : 0)

  // What an empty result set is empty OF. "No collections" on its own is a dead
  // end; the search that produced it is named, so it is clear which of the box,
  // the query or the filters is responsible.
  const narrowed = [
    filters.scope !== 'all' ? SCOPE_LABELS[filters.scope] : null,
    ...filters.status.map((status) => STATUS_LABELS[status]),
    ...filters.has.map((has) => HAS_LABELS[has]),
  ].filter(Boolean)

  const noCollections = term
    ? `Nothing matches “${term}”${narrowed.length ? ` — ${narrowed.join(', ')}` : ''}.`
    : `Nothing matches ${narrowed.length ? narrowed.join(', ') : 'this search'}.`

  // The extra narrowings live in a popover, so — unlike a disclosure sitting in
  // the flow — it has to be dismissed deliberately: on Escape, or on a click
  // anywhere else. `open` is mirrored into state because a <details> toggling is
  // not a React update, and without it the listeners below would only ever be
  // attached on a render that happened to find the menu shut.
  const filterMenu = useRef<HTMLDetailsElement>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    const menu = filterMenu.current
    if (!menu || !filtersOpen) return

    const close = () => {
      menu.open = false
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!menu.contains(event.target as Node)) close()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      close()
      menu.querySelector('summary')?.focus()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [filtersOpen])

  return (
    <section className="space-y-2">
      <h1 className="mx-auto w-full max-w-[900px] text-[28px] font-semibold tracking-heading text-center text-text-h">
        Search
      </h1>

      {/* The bar and the two narrowings that sit with it are pinned to the top of
          the window for as long as the page is scrolled. There is one position and
          it is the same whether the box is empty or full: the search did not move
          when you started typing, and it does not move when you stop. Only the
          title scrolls away under it.

          The negative margins cancel the page gutters and the column's own top
          padding so the panel is flush with the window rather than floating in a
          gutter, and the blur plus the canvas behind it keep a result scrolling
          underneath from showing through the gap the shadow leaves. */}
      <header
        className={`sticky top-0 z-10 -mx-6 bg-bg px-6 pt-4 pb-3 backdrop-blur-xl ${
          filtersOpen ? 'pb-6' : ''
        }`}
      >
        <div className="mx-auto flex w-full max-w-[900px] flex-col items-center gap-3 text-center">
          {/* One box for everything. Collections search every word in a collection;
              people search usernames. Both run off this same query. */}
          <div className="w-full">
            <label htmlFor="search-q" className="sr-only">
              Search collections and people
            </label>
            <input
              id="search-q"
              type="search"
              value={filters.q}
              onChange={(event) => set('q', event.target.value)}
              placeholder="trip budget, or a username"
              autoComplete="off"
              className="w-full rounded-full bg-surface px-7 py-4 text-[18px] text-text-h shadow-float outline-none placeholder:text-inactive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            />
            <p className="mt-3 text-[13px] text-text">

            </p>
          </div>

          {/* The two narrowings that matter most sit out in the open under the bar;
              the rest stay tucked away behind the summary. */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <label htmlFor="search-scope" className="sr-only">
              Whose collections
            </label>
            <Select
              id="search-scope"
              value={filters.scope}
              onChange={(event) => set('scope', event.target.value as Scope)}
            >
              {SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {SCOPE_LABELS[scope]}
                </option>
              ))}
            </Select>

            <details
              ref={filterMenu}
              className="group relative"
              onToggle={(event) => setFiltersOpen(event.currentTarget.open)}
            >
              <summary
                className={`flex cursor-pointer list-none items-center gap-1.5 rounded-full bg-fill px-4 py-2 text-[14px] text-text-h ${focusRing}`}
              >
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[12px] font-medium text-on-accent">
                    {activeFilterCount}
                  </span>
                )}
              </summary>

              <Card className="absolute top-full left-1/2 z-10 mt-2 w-[min(30rem,90vw)] -translate-x-1/2">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label htmlFor="search-sort" className="text-[13px] font-medium text-text-h">
                      Sort by
                    </label>
                    <Select
                      id="search-sort"
                      className="w-full"
                      value={filters.sort}
                      onChange={(event) => set('sort', event.target.value as Sort)}
                    >
                      {SORT_OPTIONS.map((sort) => (
                        <option key={sort} value={sort}>
                          {SORT_LABELS[sort]}
                        </option>
                      ))}
                    </Select>
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

                  <Button
                    variant="secondary"
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                  >
                    Clear filters
                  </Button>
                </div>
              </Card>
            </details>
          </div>
        </div>
      </header>

      {busy && (
        <p role="status" className="text-center text-[15px] text-text">
          Searching…
        </p>
      )}

      {collectionError && (
        <p role="alert" className="text-[15px] text-danger">
          {collectionError}
        </p>
      )}

      {peopleError && (
        <p role="alert" className="text-[15px] text-danger">
          {peopleError}
        </p>
      )}

      {/* One column, the width of the bar above it, so a result line starts
          under the box that produced it. */}
      <div className="mx-auto w-full max-w-[900px] space-y-10">
        <section aria-labelledby="search-collections-heading" className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2
              id="search-collections-heading"
              className="text-[17px] font-semibold tracking-heading text-text-h"
            >
              Collections
            </h2>
            {results && results.pagination.total > 0 && (
              <span className="text-[14px] text-text">
                {results.pagination.total === 1
                  ? '1 collection'
                  : `${results.pagination.total} collections`}
              </span>
            )}
          </div>

          {/* Old results stay on screen while the next search runs, so a page of
              twelve collections does not blink back to an empty box on every
              keystroke. */}
          {results && results.collections.length > 0 ? (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {results.collections.map((collection) => (
                  <li key={collection.id}>
                    <FolderCard collection={collection} />
                  </li>
                ))}
              </ul>

              <Pager
                pagination={results.pagination}
                disabled={busy}
                onPage={(page) => setFilters((current) => ({ ...current, page }))}
              />
            </>
          ) : (
            !busy &&
            !collectionError && (
              <p className="text-[15px] text-text">{noCollections}</p>
            )
          )}
        </section>

        {/* Only inside the window the server will accept a username in, so this
            section never claims to have searched for something it did not. */}
        {peopleRequested && (
          <section aria-labelledby="search-people-heading" className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2
                id="search-people-heading"
                className="text-[17px] font-semibold tracking-heading text-text-h"
              >
                People
              </h2>
              {people.length > 0 && (
                <span className="text-[14px] text-text">
                  {people.length === 1 ? '1 person' : `${people.length} people`}
                </span>
              )}
            </div>

            {people.length > 0 ? (
              <Card className="overflow-hidden p-0">
                <ul className="divide-y divide-inactive">
                  {people.map((hit) => (
                    <PersonRow key={hit.id} hit={hit} />
                  ))}
                </ul>
              </Card>
            ) : (
              !busy &&
              !peopleError && (
                <p className="text-[15px] text-text">
                  Nobody here has a username starting with “{term}”.
                </p>
              )
            )}
          </section>
        )}
      </div>
    </section>
  )
}