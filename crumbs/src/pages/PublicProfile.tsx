import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Avatar from '../components/Avatar'
import FriendsDialog from '../components/FriendsDialog'
import SuggestedFriends from '../components/SuggestedFriends'
import CrumbViewer from '../components/CrumbViewer'
import FolderCard from '../components/FolderCard'
import SignOutButton from '../components/SignOutButton'
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
import Button, { ButtonLink } from '../components/Button'
import Squircle from '../components/Squircle'
import { focusRing, RADIUS } from '../lib/ui'

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
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await removeFriend(profile.id)
              }, 'none')
            }
          >
            {busy ? 'Working…' : 'Remove friend'}
          </Button>
        )
      case 'request_sent':
        return (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await declineFriendRequest(profile.requestId as string)
              }, 'none')
            }
          >
            {busy ? 'Working…' : 'Cancel request'}
          </Button>
        )
      case 'request_received':
        return (
          <span className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await acceptFriendRequest(profile.requestId as string)
                }, 'friends')
              }
            >
              {busy ? 'Working…' : 'Accept request'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void act(async () => {
                  await declineFriendRequest(profile.requestId as string)
                }, 'none')
              }
            >
              Decline
            </Button>
          </span>
        )
      default:
        return (
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void act(async () => {
                await sendFriendRequest(profile.id)
              }, 'request_sent')
            }
          >
            {busy ? 'Working…' : 'Add friend'}
          </Button>
        )
    }
  })()

  return (
    <div className="space-y-2">
      {body}
      {error && (
        <p role="alert" className="text-[15px] text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

// Only rendered on your own profile, where it is the way out of the app. The
// sidebar carries the same button, so this is the second way in rather than the
// only one.
function SignOut() {
  return <SignOutButton variant="button" />
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
      <section className="mx-auto max-w-md space-y-4">
        <h1 className="text-[28px] font-semibold tracking-heading text-text-h">Profile</h1>
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

  if (!profile) {
    return (
      <section>
        <p role="status" className="text-[15px] text-text">
          Loading…
        </p>
      </section>
    )
  }

  const displayName = fullName(profile) || profile.username

  return (
    <section className="space-y-6 pt-10">
      <header className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="size-36 shrink-0 text-2xl">
            <Avatar user={profile} className='!text-6xl' />
          </div>
          {/* One block of text at four sizes, so it is set tight: the name's own
              line-height at 48px would otherwise put a third of its height of
              empty leading under it and drop the handle a whole line away. */}
          <div className="text-left">
            <h1 className="text-[32px] leading-[1.05] font-semibold tracking-heading text-text-h">
              {displayName}
            </h1>
            <p className="-mt-0.5 text-[20px] text-text">
              @{profile.username}
            </p>
            <p className="-mt-0.5 text-[14px] text-text">{joinedOn(profile.createdAt)}</p>
            {profile.friendsCount !== null &&
              (profile.isSelf ? (
                <p className="text-[14px]">
                  <button
                    type="button"
                    onClick={() => setFriendsOpen(true)}
                    className={`rounded text-accent underline underline-offset-4 ${focusRing}`}
                  >
                    {profile.friendsCount}{' '}
                    {profile.friendsCount === 1 ? 'friend' : 'friends'}
                  </button>
                </p>
              ) : (
                <p className="text-[14px] text-text">
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
              <ButtonLink to="/edit-profile" variant="outline">
                Edit profile
              </ButtonLink>
              <SignOut />
            </>
          )}
        </div>
      </header>

      {profile.isSelf && <SuggestedFriends />}

      {canSeePrivate && (
        <>
          <section aria-labelledby="profile-crumbs-heading" className="space-y-3 text-left">
            <h2 id="profile-crumbs-heading" className="text-[17px] font-semibold tracking-heading text-text-h">
              {profile.isSelf ? 'Your crumbs' : 'Crumbs'}
            </h2>

            {crumbs === null ? (
              <p role="status" className="text-[15px] text-text">
                Loading crumbs…
              </p>
            ) : crumbs.length === 0 ? (
              <p className="text-[15px] text-text">
                {profile.isSelf ? 'You have no crumbs yet.' : 'No crumbs.'}
              </p>
            ) : (
              <>
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
                  {crumbs.slice(0, 12).map((crumb, index) => (
                    <li key={crumb.id}>
                      {/* The shadow sits on the button rather than on the Squircle inside it: that
                        one is clipped to its superellipse, which would take the
                        shadow with it. The button is the same box, so it lands
                        in the same place.

                        A small one, not the crumb shadow the canvas uses: these
                        are packed into a grid a few pixels apart, where a wide
                        diffuse shadow would read as each photo floating free of
                        its neighbours. Here it only has to give a white photo an
                        edge against the grey canvas. */}
                      <button
                        type="button"
                        onClick={() => setSelected(crumb)}
                        aria-label={crumbLabel(crumb) || 'Open crumb'}
                        className={`block w-full cursor-pointer rounded-grid shadow-sm transition duration-200 ease-ios hover:brightness-[0.97] ${focusRing}`}
                      >
                        {/* A gentle scatter, so the grid reads as a pile of
                            memories rather than a spreadsheet. The rotation is
                            per-item and small enough that no two neighbours
                            share a tilt. */}
                        {/* RADIUS.grid, between the canvas tile and the small
                            thumbnails: at 3 columns on a phone these are about
                            100px, so tile's 40px would be 40% of the width and
                            read as a lozenge rather than a rounded square. */}
                        <Squircle
                          radius={RADIUS.grid}
                          className="overflow-hidden bg-fill"
                          style={{
                            transform: `rotate(${index % 3 === 1 ? -2.5 : index % 3 === 2 ? 2.5 : 0}deg)`,
                          }}
                        >
                          <img
                            src={crumbSrc(crumb.imageUrl)}
                            alt=""
                            loading="lazy"
                            className="aspect-square w-full object-cover"
                          />
                        </Squircle>
                      </button>
                    </li>
                  ))}
                </ul>
                {crumbs.length > 12 && (
                  <p className="text-[14px] text-text">and {crumbs.length - 12} more.</p>
                )}
              </>
            )}
          </section>

          <section
            aria-labelledby="profile-collections-heading"
            className="space-y-3 text-left"
          >
            <h2 id="profile-collections-heading" className="text-[17px] font-semibold tracking-heading text-text-h">
              {profile.isSelf ? 'Your collections' : 'Shared collections'}
            </h2>

            {collections === null ? (
              <p role="status" className="text-[15px] text-text">
                Loading collections…
              </p>
            ) : collections.length === 0 ? (
              <p className="text-[15px] text-text">
                {profile.isSelf ? 'No collections yet.' : 'Nothing shared with you.'}
              </p>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {collections.map((collection) => (
                  <li key={collection.id}>
                    {/* A small shadow, not the floating one the collections page
                        uses: these sit in a tight grid beside the crumb and
                        suggestion sections, where a wide shadow is only a rim on
                        every photo. Matches the crumb tiles above. */}
                    <FolderCard collection={collection} tileShadow="shadow-sm" />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      {!canSeePrivate && (
        <p className="text-left text-[15px] text-text">
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
