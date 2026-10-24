import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X } from '@untitledui/icons/X'
import Avatar from './Avatar'
import Button from './Button'
import { ApiError } from '../lib/api'
import { fetchSuggestions, profilePath, sendFriendRequest } from '../lib/people'
import type { Suggestion } from '../lib/people'
import { fullName } from '../lib/user'
import { focusRing, pressable } from '../lib/ui'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; suggestions: Suggestion[] }

/**
 * One stranger, as a tile rather than a row.
 *
 * Face first, because at this size a face is what tells you whether you know
 * them; the reason underneath is what makes the tile legible rather than a grid
 * of strangers.
 */
function SuggestionCard({ suggestion }: { suggestion: Suggestion }) {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const add = async () => {
    setBusy(true)
    setError(null)
    try {
      await sendFriendRequest(suggestion.id)
      setSent(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the request.')
    } finally {
      setBusy(false)
    }
  }

  // Avatar needs a real string for the initial it falls back to, and a
  // suggestion without a username cannot be linked to.
  const username = suggestion.username ?? '?'
  const name = fullName(suggestion)

  return (
    <li className="w-40 shrink-0">
      <div className="flex h-full flex-col items-center gap-1.5 rounded-control bg-surface p-3 text-center">
        <Link
          to={profilePath(suggestion.username)}
          className={`flex w-full flex-col items-center gap-1.5 rounded-control no-underline ${focusRing} ${pressable}`}
        >
          <div className="size-12 shrink-0 text-xl">
            <Avatar user={{ ...suggestion, username }} />
          </div>

          <span className="w-full min-w-0">
            <span className="block truncate text-[15px] font-medium text-text-h">
              {name || username}
            </span>
            <span className="block truncate text-[14px] text-text">@{username}</span>
            <span className="block truncate text-[13px] text-text">{suggestion.reason}</span>
          </span>
        </Link>

        <Button
          variant="secondary"
          size="sm"
          className="mt-auto w-full"
          disabled={busy || sent}
          onClick={() => void add()}
        >
          {sent ? 'Request sent' : busy ? 'Sending…' : 'Add friend'}
        </Button>

        {error && (
          <span role="alert" className="text-[13px] text-danger">
            {error}
          </span>
        )}
      </div>
    </li>
  )
}

export default function SuggestedFriends() {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  // Closed means gone, and it stays gone for this visit: the heading goes with
  // it, so what is left is the profile and nothing to reopen it from. Nothing is
  // remembered about the choice, so the next visit to the page brings it back.
  const [closed, setClosed] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchSuggestions()
      .then((suggestions) => {
        if (!cancelled) setState({ status: 'ready', suggestions })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Could not load suggestions.',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [attempt])

  // Below the hooks, because a hook that is skipped on the way out is a hook
  // that changes order the next time the section comes back.
  if (closed) return null

  return (
    <section aria-labelledby="suggested-friends-heading" className="space-y-3 text-left">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="suggested-friends-heading"
          className="text-[17px] font-semibold tracking-heading text-text-h"
        >
          People you may know
        </h2>

        <button
          type="button"
          onClick={() => setClosed(true)}
          aria-label="Hide people you may know"
          title="Hide people you may know"
          className={`grid size-7 shrink-0 place-items-center rounded-full text-text hover:bg-fill hover:text-text-h ${focusRing} ${pressable}`}
        >
          <X size={16} strokeWidth={1.75} />
        </button>
      </div>

        {state.status === 'loading' && (
        <p role="status" className="text-[15px] text-text">
          Looking for people you might know…
        </p>
      )}

      {state.status === 'error' && (
        <div className="space-y-3">
          <p role="alert" className="text-[15px] text-danger">
            {state.message}
          </p>
          <Button
            variant="secondary"
            onClick={() => {
              setState({ status: 'loading' })
              setAttempt((n) => n + 1)
            }}
          >
            Try again
          </Button>
        </div>
      )}

      {state.status === 'ready' &&
        // Everybody you know already, or nobody has signed up yet — either way
        // there is nothing to put under the heading.
        (state.suggestions.length === 0 ? (
          <p className="text-[15px] text-text">Nobody new to meet yet.</p>
        ) : (
          /* One row that runs off the edge. Ten strangers are too many to wrap
             onto a second line and push the crumbs below them down the page, and
             the cut-off card is itself the hint that there are more. fade-edges
             softens both cuts so the row dissolves into the page instead of being
             sliced off at the boundary. */
          <ul className="scrollbar-hidden fade-edges -mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1">
            {state.suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </ul>
        ))}
    </section>
  )
}
