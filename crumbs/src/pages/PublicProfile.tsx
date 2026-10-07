import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import FriendsDialog from '../components/FriendsDialog'
import CrumbViewer from '../components/CrumbViewer'
import CollectionCard from '../components/CollectionCard'
import { ApiError } from '../lib/api'
import { crumbLabel, crumbSrc } from '../lib/crumbs'
import { fullName } from '../lib/user'
import {
  acceptFriendRequest,
  declineFriendRequest,
  fetchProfile,
  fetchProfileCollections,
  fetchProfileCrumbs,
  removeFriend,
  sendFriendRequest,
} from '../lib/people'
import type { PublicProfile, Relationship } from '../lib/people'
import type { Crumb } from '../lib/schemas'
import type { Collection } from '../lib/collectionSchemas'
import { useAuth } from '../hooks/useAuth'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
const buttonClass = `rounded-md border border-border px-4 py-2 font-heading text-text-h disabled:opacity-50 ${focusRing}`
const primaryClass = `rounded-md bg-accent px-4 py-2 font-heading text-bg disabled:opacity-50 ${focusRing}`

const joinFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' })

function joinedOn(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : `Joined ${joinFormat.format(date)}`
}

// The friendship controls. Which button is offered follows the relationship the
// server reported, so there is nothing here that can be a dead end.
function FriendActions({
  profile,
  onChanged,
}: {
  profile: PublicProfile
  onChanged: (next: Relationship) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const act = async (work: () => Promise<void>, next: Relationship) => {
    setBusy(true)
    setError(null)
    try {
      await work()
      onChanged(next)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (profile.isSelf) return null

  const body = (() => {
    switch (profile.relationship) {
      case 'friends':
        return (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await removeFriend(profile.id)
              }, 'none')
            }
            className={buttonClass}
          >
            {busy ? 'Working…' : 'Remove friend'}
          </button>
        )
      case 'request_sent':
        return (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await declineFriendRequest(profile.requestId as string)
              }, 'none')
            }
            className={buttonClass}
          >
            {busy ? 'Working…' : 'Cancel request'}
          </button>
        )
      case 'request_received':
        return (
          <span className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await acceptFriendRequest(profile.requestId as string)
                }, 'friends')
              }
              className={primaryClass}
            >
              {busy ? 'Working…' : 'Accept request'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await declineFriendRequest(profile.requestId as string)
                }, 'none')
              }
              className={buttonClass}
            >
              Decline
            </button>
          </span>
        )
      default:
        return (
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await sendFriendRequest(profile.id)
              }, 'request_sent')
            }
            className={primaryClass}
          >
            {busy ? 'Working…' : 'Add friend'}
          </button>
        )
    }
  })()

  return (
    <div className="space-y-2">
      {body}
      {error && (
        <p role="alert" className="text-sm text-accent">
          {error}
        </p>
      )}
    </div>
  )
}

// Only rendered on your own profile, where it is the way out of the app.
function SignOut() {
  const { logout } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signOut = async () => {
    setBusy(true)
    setError(null)
    try {
      await logout()
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not sign you out. Try again.',
      )
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={() => void signOut()} disabled={busy} className={buttonClass}>
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      <div aria-live="polite">
        {error && (
          <p role="alert" className="text-sm text-accent">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

export default function PublicProfilePage() {
  const { username = '' } = useParams<{ username: string }>()

  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null)
  const [collections, setCollections] = useState<Collection[] | null>(null)
  const [selected, setSelected] = useState<Crumb | null>(null)
  const [friendsOpen, setFriendsOpen] = useState(false)

  useEffect(() => {
    if (!username) return
    let cancelled = false

    const run = async () => {
      try {
        const found = await fetchProfile(username)
        if (cancelled) return
        setProfile(found)
        setLoadError(null)
      } catch (error) {
        if (cancelled) return
        setLoadError(
          error instanceof ApiError ? error.message : 'Could not load this profile.',
        )
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [username])

  // Only friends (and you) get a timeline and shared collections. A stranger's
  // profile never asks for them, because the server would answer 404 anyway.
  const canSeePrivate =
    profile !== null && (profile.isSelf || profile.relationship === 'friends')

  useEffect(() => {
    if (!profile || !canSeePrivate) return
    let cancelled = false

    const run = async () => {
      const [crumbsResult, collectionsResult] = await Promise.allSettled([
        fetchProfileCrumbs(profile.username),
        fetchProfileCollections(profile.username),
      ])
      if (cancelled) return

      setCrumbs(crumbsResult.status === 'fulfilled' ? crumbsResult.value.crumbs : [])
      setCollections(
        collectionsResult.status === 'fulfilled' ? collectionsResult.value : [],
      )
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [profile, canSeePrivate])

  // Becoming or ceasing to be friends changes what may be shown.
  const onRelationshipChanged = useCallback(
    (next: Relationship) => {
      setProfile((current) =>
        current
          ? {
              ...current,
              relationship: next,
              requestId: next === 'request_received' ? current.requestId : null,
            }
          : current,
      )
      setCrumbs(null)
      setCollections(null)
    },
    [],
  )

  if (loadError) {
    return (
      <section className="space-y-4">
        <h1 className="my-0!">Profile</h1>
        <p role="alert" className="text-accent">
          {loadError}
        </p>
        <Link to="/collections" className="text-accent underline">
          Back to collections
        </Link>
      </section>
    )
  }

  if (!profile) {
    return (
      <section>
        <p role="status" className="text-text">
          Loading…
        </p>
      </section>
    )
  }

  const displayName = fullName(profile) || profile.username

  return (
    <section className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <Avatar user={profile} className="size-20 text-2xl" />
          <div className="space-y-1 text-left">
            <h1 className="my-0! text-3xl">{displayName}</h1>
            <p className="text-text">
              @{profile.username}
              {profile.username !== displayName ? ` · ${displayName}` : ''}
            </p>
            <p className="text-sm text-text">{joinedOn(profile.createdAt)}</p>
            {profile.friendsCount !== null &&
              (profile.isSelf ? (
                <p className="text-sm">
                  <button
                    type="button"
                    onClick={() => setFriendsOpen(true)}
                    className={`rounded text-accent underline ${focusRing}`}
                  >
                    {profile.friendsCount}{' '}
                    {profile.friendsCount === 1 ? 'friend' : 'friends'}
                  </button>
                </p>
              ) : (
                <p className="text-sm text-text">
                  {profile.friendsCount}{' '}
                  {profile.friendsCount === 1 ? 'friend' : 'friends'}
                </p>
              ))}
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-3">
          <FriendActions profile={profile} onChanged={onRelationshipChanged} />

          {profile.isSelf && (
            <>
              <Link to="/edit-profile" className={buttonClass}>
                Edit profile
              </Link>
              <Link to="/crumbs" className={buttonClass}>
                My crumbs
              </Link>
              <SignOut />
            </>
          )}
        </div>
      </header>

      {profile.isSelf && (
        <p className="text-left text-sm text-text">
          <Link to="/collections" className="text-accent underline">
            My collections
          </Link>
        </p>
      )}

      {canSeePrivate && (
        <>
          <section aria-labelledby="profile-crumbs-heading" className="space-y-3 text-left">
            <h2 id="profile-crumbs-heading" className="text-xl">
              {profile.isSelf ? 'Your crumbs' : 'Crumbs'}
            </h2>

            {crumbs === null ? (
              <p role="status" className="text-text">
                Loading crumbs…
              </p>
            ) : crumbs.length === 0 ? (
              <p className="text-text">
                {profile.isSelf ? 'You have no crumbs yet.' : 'No crumbs.'}
              </p>
            ) : (
              <>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {crumbs.slice(0, 12).map((crumb) => (
                    <li key={crumb.id}>
                      <button
                        type="button"
                        onClick={() => setSelected(crumb)}
                        aria-label={crumbLabel(crumb) || 'Open crumb'}
                        className={`block aspect-square w-full cursor-pointer overflow-hidden ${focusRing}`}
                      >
                        <img
                          src={crumbSrc(crumb.imageUrl)}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover"
                        />
                      </button>
                    </li>
                  ))}
                </ul>
                {crumbs.length > 12 && (
                  <p className="text-sm text-text">and {crumbs.length - 12} more.</p>
                )}
              </>
            )}
          </section>

          <section
            aria-labelledby="profile-collections-heading"
            className="space-y-3 text-left"
          >
            <h2 id="profile-collections-heading" className="text-xl">
              {profile.isSelf ? 'Your collections' : 'Shared collections'}
            </h2>

            {collections === null ? (
              <p role="status" className="text-text">
                Loading collections…
              </p>
            ) : collections.length === 0 ? (
              <p className="text-text">
                {profile.isSelf ? 'No collections yet.' : 'Nothing shared with you.'}
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {collections.map((collection) => (
                  <li key={collection.id}>
                    <CollectionCard collection={collection} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {!canSeePrivate && (
        <p className="text-left text-sm text-text">
          Crumbs and shared collections are only visible to friends.
        </p>
      )}

      <CrumbViewer
        crumb={selected}
        onClose={() => setSelected(null)}
        onDeleted={(id) => setCrumbs((current) => (current ?? []).filter((c) => c.id !== id))}
      />
      <FriendsDialog
        open={friendsOpen}
        onClose={() => setFriendsOpen(false)}
        onOpenProfile={() => setFriendsOpen(false)}
      />
    </section>
  )
}
