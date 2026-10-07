import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFriends } from '../lib/friends'
import { profilePath } from '../lib/people'
import type { Friend } from '../lib/schemas'
import { fullName } from '../lib/user'
import Avatar from './Avatar'

type State =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; friends: Friend[] }

function FriendsList({ onOpenProfile }: { onOpenProfile?: () => void }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    fetchFriends()
      .then((friends) => {
        if (!cancelled) setState({ status: 'ready', friends })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message:
              error instanceof Error ? error.message : 'Could not load your friends.',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [attempt])

  if (state.status === 'loading') {
    return (
      <p role="status" className="px-5 py-6 text-text">
        Loading friends…
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-3 px-5 py-6">
        <p role="alert" className="text-accent">
          {state.message}
        </p>
        <button
          type="button"
          onClick={() => {
            setState({ status: 'loading' })
            setAttempt((n) => n + 1)
          }}
          className="rounded-md border border-border px-4 py-2 font-heading text-text-h"
        >
          Try again
        </button>
      </div>
    )
  }

  if (state.friends.length === 0) {
    // Search can now find anyone, so the dialog does not carry its own search
    // box; it points at the one place that does.
    return (
      <p className="px-5 py-6 text-text">
        No friends yet.{' '}
        <Link to="/search" onClick={onOpenProfile} className="text-accent underline">
          Search for people
        </Link>
      </p>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {state.friends.map((friend) => {
        const name = fullName(friend)
        return (
          <li key={friend.id} className="flex items-center gap-3 px-5 py-3">
            <Avatar user={friend} className="size-11 shrink-0 text-lg" />
            <Link
              to={profilePath(friend.username)}
              className="min-w-0 flex-1 rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              onClick={onOpenProfile}
            >
              <span className="block truncate font-heading text-text-h no-underline">
                {name || friend.username}
              </span>
              {name && <span className="block truncate text-sm text-text">@{friend.username}</span>}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}

export default function FriendsDialog({
  open,
  onClose,
  onOpenProfile,
}: {
  open: boolean
  onClose: () => void
  // Following a profile link inside a modal dialog would leave the page behind
  // a backdrop, so the caller closes it first.
  onOpenProfile?: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby="friends-dialog-heading"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-auto max-h-[80dvh] w-[min(28rem,calc(100%-2rem))] flex-col overflow-hidden rounded-lg border border-border bg-bg p-0 text-left text-text open:flex backdrop:bg-black/60"
    >
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <h2 id="friends-dialog-heading" className="my-0!">
          Friends
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-border px-3 py-1.5 font-heading text-text-h"
        >
          Close
        </button>
      </div>
      {open && <FriendsList onOpenProfile={onOpenProfile} />}
    </dialog>
  )
}
