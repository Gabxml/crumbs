import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchFriends } from '../lib/friends'
import { profilePath } from '../lib/people'
import type { Friend } from '../lib/schemas'
import { fullName } from '../lib/user'
import Avatar from './Avatar'
import Button from './Button'
import Modal from './Modal'
import { focusRing } from '../lib/ui'

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
      <p role="status" className="py-4 text-[15px] text-text">
        Loading friends…
      </p>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="space-y-3 py-2">
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
    )
  }

  if (state.friends.length === 0) {
    // Search can now find anyone, so the dialog does not carry its own search
    // box; it points at the one place that does.
    return (
      <p className="py-4 text-[15px] text-text">
        No friends yet.{' '}
        <Link
          to="/search"
          onClick={onOpenProfile}
          className="rounded text-accent underline underline-offset-4"
        >
          Search for people
        </Link>
      </p>
    )
  }

  return (
    // One column of rows rather than a list per column, so the name and handle
    // stay on the same line at every width.
    <ul className="-mx-1 space-y-0.5">
      {state.friends.map((friend) => {
        const name = fullName(friend)
        return (
          <li key={friend.id}>
            <Link
              to={profilePath(friend.username)}
              onClick={onOpenProfile}
              className={`flex items-center gap-3 rounded-control p-2 no-underline transition duration-200 ease-ios hover:bg-fill ${focusRing}`}
            >
              <div className="size-11 shrink-0">
                <Avatar user={friend} />
              </div>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-medium text-text-h">
                  {name || friend.username}
                </span>
                {name && (
                  <span className="block truncate text-[14px] text-text">
                    @{friend.username}
                  </span>
                )}
              </span>
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
  return (
    <Modal open={open} onClose={onClose} title="Friends">
      {open && <FriendsList onOpenProfile={onOpenProfile} />}
    </Modal>
  )
}
