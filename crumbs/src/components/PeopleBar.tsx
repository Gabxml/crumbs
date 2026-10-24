import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from '@untitledui/icons/Plus'
import { Trash01 } from '@untitledui/icons/Trash01'
import { ApiError } from '../lib/api'
import { fetchFriends } from '../lib/friends'
import { profilePath } from '../lib/people'
import { shareCollection, unshareCollection } from '../lib/collections'
import { fullName } from '../lib/user'
import type { Friend } from '../lib/schemas'
import type { Collection } from '../lib/collectionSchemas'
import Avatar from './Avatar'
import Button from './Button'
import Modal from './Modal'
import { focusRing, pressable } from '../lib/ui'

/**
 * Who is on this collection, and the one control for changing it.
 *
 * Faces rather than names: a collection is mostly about the people filling it in,
 * and a line reading "Shared with alex, sam and jordan" says the same thing three
 * times over. The plus opens the list, and that one list does both jobs — adding
 * somebody who is not on the collection yet, and taking somebody off it — because
 * they are the same decision seen from two sides.
 */
export default function PeopleBar({
  collection,
  onChanged,
}: {
  collection: Collection
  /** The collection as the server now has it, or as this page now has it. */
  onChanged: (next: Collection) => void
}) {
  const [listing, setListing] = useState(false)

  // A person the API describes without a username cannot be linked to or
  // labelled, so they are dropped rather than drawn as a blank.
  const everyone = [collection.owner, ...collection.collaborators].filter(
    (person) => person.username,
  )
  const shown = everyone.slice(0, 4)
  const hidden = everyone.length - shown.length
  const isOwner = collection.role === 'owner'

  return (
    <div className="flex items-center justify-end gap-1">
      <ul className="flex -space-x-1.5">
        {shown.map((person) => (
          <li key={person.id} className="contents">
            <Link
              to={profilePath(person.username)}
              aria-label={`${person.username}'s profile`}
              className={`rounded-full ${focusRing}`}
            >
              <div className="size-8">
                {/* The ring is what separates one overlapping face from the next. */}
                <Avatar
                  user={{
                    username: person.username as string,
                    firstName: person.firstName,
                    lastName: person.lastName,
                    avatarUrl: person.avatarUrl,
                  }}
                  ring
                />
              </div>
            </Link>
          </li>
        ))}
        {hidden > 0 && (
          <li className="grid size-8 place-items-center rounded-full bg-fill text-[12px] font-medium text-text ring-2 ring-bg">
            +{hidden}
          </li>
        )}
      </ul>

      {/* Only the creator may change the list — the server refuses everyone else
          — so a collaborator gets the faces and nothing to press. */}
      {isOwner && (
        <>
          <button
            type="button"
            onClick={() => setListing(true)}
            aria-label="Add or remove people"
            title="Add or remove people"
            className={`grid size-8 shrink-0 place-items-center rounded-full bg-fill text-text hover:text-text-h ${focusRing} ${pressable}`}
          >
            <Plus size={16} strokeWidth={1.75} />
          </button>

          <PeopleDialog
            open={listing}
            collection={collection}
            onClose={() => setListing(false)}
            onChanged={onChanged}
          />
        </>
      )}
    </div>
  )
}

type DialogState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; friends: Friend[] }

/**
 * The friends list, as the place a collection's people are managed from.
 *
 * Every friend appears, whether or not they are on this collection already: the
 * ones who are have Remove, the ones who are not have Add. Nobody is hidden from
 * the other half of the list, because a person you cannot see is a person you
 * cannot add.
 */
function PeopleDialog({
  open,
  collection,
  onClose,
  onChanged,
}: {
  open: boolean
  collection: Collection
  onClose: () => void
  onChanged: (next: Collection) => void
}) {
  const [state, setState] = useState<DialogState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false

    fetchFriends()
      .then((friends) => {
        if (!cancelled) setState({ status: 'ready', friends })
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load your friends.',
          })
        }
      })

    return () => {
      cancelled = true
    }
  }, [open, attempt])

  const add = async (userId: string) => {
    setBusy(userId)
    setError(null)
    try {
      onChanged(await shareCollection(collection.id, userId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add them.')
    } finally {
      setBusy(null)
    }
  }

  const remove = async (userId: string) => {
    setBusy(userId)
    setError(null)
    try {
      await unshareCollection(collection.id, userId)
      // The endpoint answers with a message rather than with the collection, so
      // the list of people is rebuilt here instead of parsed out of the reply.
      // Nothing else about the collection depends on who is on it.
      onChanged({
        ...collection,
        collaborators: collection.collaborators.filter((person) => person.id !== userId),
      })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove them.')
    } finally {
      setBusy(null)
    }
  }

  const already = new Set(collection.collaborators.map((person) => person.id))

  return (
    <Modal open={open} onClose={onClose} title="People on this collection">
      <div className="space-y-4 flex flex-col gap-4">
        <p className="text-[14px] text-text">
          Anyone on your friends list can be added..
        </p>

        {state.status === 'loading' && (
          <p role="status" className="text-[15px] text-text">
            Loading your friends…
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
          (state.friends.length === 0 ? (
            <p className="text-[15px] text-text">
              No friends yet.{' '}
              <Link
                to="/search"
                onClick={onClose}
                className={`rounded text-accent underline underline-offset-4 ${focusRing}`}
              >
                Search for people
              </Link>
            </p>
          ) : (
            // One column of rows, so the name and the handle stay on the same
            // line at every width.
            <ul className="-mx-1 space-y-0.5">
              {state.friends.map((friend) => {
                const on = already.has(friend.id)
                const name = fullName(friend)

                return (
                  <li key={friend.id} className="flex items-center gap-3 p-2">
                    {/* Following the link closes this first: a profile behind a
                        dialog's backdrop is a page you cannot get out of. */}
                    <Link
                      to={profilePath(friend.username)}
                      onClick={onClose}
                      aria-label={`${friend.username}'s profile`}
                      className={`shrink-0 rounded-full ${focusRing}`}
                    >
                      <div className="size-10">
                        <Avatar user={friend} />
                      </div>
                    </Link>

                    <Link
                      to={profilePath(friend.username)}
                      onClick={onClose}
                      className={`min-w-0 flex-1 rounded no-underline ${focusRing}`}
                    >
                      <span className="block truncate text-[15px] font-medium text-text-h">
                        {name || friend.username}
                      </span>
                      {name && (
                        <span className="block truncate text-[14px] text-text">
                          @{friend.username}
                        </span>
                      )}
                    </Link>

                    {on ? (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => void remove(friend.id)}
                      >
                        {busy === friend.id ? (
                          'Removing…'
                        ) : (
                          <>
                            <Trash01 size={14} strokeWidth={1.75} />
                            Remove
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy !== null}
                        onClick={() => void add(friend.id)}
                      >
                        {busy === friend.id ? 'Adding…' : 'Add'}
                      </Button>
                    )}
                  </li>
                )
              })}
            </ul>
          ))}

        {error && (
          <p role="alert" className="text-[15px] text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  )
}