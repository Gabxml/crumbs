import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash01 } from '@untitledui/icons/Trash01'
import { X } from '@untitledui/icons/X'
import { crumbPosted, crumbSrc, deleteCrumb } from '../lib/crumbs'
import { useAuth } from '../hooks/useAuth'
import { fetchUser } from '../lib/user'
import { profilePath } from '../lib/people'
import { ApiError } from '../lib/api'
import type { Crumb } from '../lib/schemas'
import type { PublicUser } from '../lib/user'
import Avatar from './Avatar'
import Button from './Button'
import Modal from './Modal'
import Squircle from './Squircle'
import { focusRing, pressable, RADIUS } from '../lib/ui'

export default function CrumbViewer({
  crumb,
  onClose,
  onDeleted,
}: {
  crumb: Crumb | null
  onClose: () => void
  // Called after the crumb is gone server-side, so the page can drop it from
  // whatever list it is holding.
  onDeleted?: (id: string) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const open = crumb !== null

  const [busy, setBusy] = useState(false)
  // The error is tagged with the crumb it belongs to, so opening a different one
  // can never show a message about this. Cheaper than clearing it in an effect.
  const [error, setError] = useState<{ crumbId: string; message: string } | null>(null)
  // Tagged with the crumb it belongs to, for the same reason as the error above:
  // opening a different crumb can never show a name belonging to this one, and
  // nothing has to be cleared when it changes.
  const [author, setAuthor] = useState<{ crumbId: string; user: PublicUser } | null>(null)
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    // Nothing to look up: the viewer is closed, or the crumb came from an API
    // that does not say who posted it.
    const target = crumb
    if (!target?.userId) return

    let cancelled = false
    fetchUser(target.userId)
      .then((user) => {
        if (!cancelled) setAuthor({ crumbId: target.id, user })
      })
      .catch(() => {
        if (!cancelled) setAuthor(null)
      })
    return () => {
      cancelled = true
    }
  }, [crumb])

  // The viewer is signed in as somebody; the crumb belongs to whoever posted it.
  // Those are two different people most of the time, which is the whole reason
  // the two are named apart here.
  const { user: me } = useAuth()

  const poster = author && crumb && author.crumbId === crumb.id ? author.user : null
  const posted = crumb ? crumbPosted(crumb) : ''
  const caption = crumb?.caption.trim() ?? ''

  // Only your own crumb can be deleted. The server says so too — DELETE
  // /api/crumbs/:id matches the crumb against your id and 404s anything else —
  // but the feed is a mix of yours and your friends', and offering a delete that
  // is guaranteed to fail is worse than not offering one. userId is nullish
  // because it was added after the crumb shape was already in use, so a crumb
  // from an API that has not been redeployed parses without it and is treated as
  // not yours rather than as a crash.
  const mine = crumb?.userId != null && crumb.userId === me?.id

// Closing the viewer takes the confirmation with it, and clears `busy`.
//
// `busy` is the one piece of state here that is not tagged with a crumb, so it is
// the one that has to be reset by hand — and a successful delete never reaches
// the line that does that, because it closes the viewer instead. Without this,
// deleting one crumb left Delete and Close disabled on every crumb opened after
// it, for as long as the page was alive.
const close = () => {
  setConfirming(false)
  setBusy(false)
  onClose()
}

  const remove = async () => {
    if (!crumb) return

    setBusy(true)
    setError(null)
    try {
      await deleteCrumb(crumb.id)
      onDeleted?.(crumb.id)
      close()
    } catch (err) {
      // The error is shown in the viewer, which the confirmation is sitting on
      // top of — so the confirmation steps aside rather than leaving the message
      // behind a modal nobody can see.
      setConfirming(false)
      setError({
        crumbId: crumb.id,
        message: err instanceof ApiError ? err.message : 'Could not delete that crumb.',
      })
      setBusy(false)
    }
  }

  return (
    // Two dialogs, not one: the photo is the lightbox, and the confirmation is
    // stacked on the top layer above it, so the photo stays visible behind the
    // question being asked about it.
    <>
      <dialog
        ref={ref}
        aria-label="Crumb"
        onClose={close}
        onClick={(event) => {
          if (event.target === event.currentTarget) close()
        }}
        className="m-auto max-h-[94dvh] max-w-[94vw] overflow-visible border-0 bg-transparent p-0 text-text open:flex backdrop:bg-black/45 backdrop:backdrop-blur-lg"
      >
        {crumb && (
          <figure className="m-0 flex flex-col items-center gap-3 text-center">
            {/* Above the photo, not on it. The two controls are about the viewer
                rather than about the picture, and sitting on the picture they
                cover whatever it happens to be — on a pale photo the scrim is the
                thing you see instead of the corner. A row of their own means the
                photo keeps its edge to itself.

                That row is not free: the viewer would grow by its height and
                start to overflow a short window, so the photo gives it back.
                The photo is square, so its height is its width, and the width is
                what is capped against the viewport — subtracting the row there
                takes it off the height instead. */}
            <div className="flex w-full items-center justify-end gap-2">
              {/* Only asks. The question and the answer are a modal of their own,
                  so a slip on this button cannot destroy a photo. */}
              {mine && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={busy}
                  aria-label="Delete this crumb"
                  title="Delete this crumb"
                  className={`grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/55 disabled:opacity-40 ${focusRing} ${pressable}`}
                >
                  <Trash01 size={18} strokeWidth={1.75} />
                </button>
              )}

              <button
                type="button"
                onClick={close}
                disabled={busy}
                aria-label="Close"
                title="Close"
                className={`grid size-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/55 disabled:opacity-40 ${focusRing} ${pressable}`}
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {/* RADIUS.viewer, not card: this is the largest photo the app ever
                shows, filling most of the screen, and 80px is the radius that can
                still read as a deliberate curve at that size. A third of card's 30px
                would look like a thumbnail scaled up.

                The 3.25rem off the cap is the control row above plus the figure's
                gap under it. */}
            <Squircle
              radius={RADIUS.viewer}
              className="overflow-hidden bg-fill shadow-float"
            >
              <img
                src={crumbSrc(crumb.imageUrl)}
                alt={caption}
                className="aspect-square w-[min(90vw,calc(70dvh_-_3.25rem))] object-cover"
              />
            </Squircle>

            {/* Who posted it and when, as one line: on a feed of other people's
                photos a picture alone does not say who to thank. Each half can be
                missing — the handle needs a lookup, and the date needs the upload
                to have carried one — so the separator only appears between two
                things that are actually there. */}
            {(poster || posted) && (
              <div className="flex items-center gap-2">
                {poster && (
                  <div className="size-8 shrink-0">
                    <Avatar user={poster} to={profilePath(poster.username)} />
                  </div>
                )}
                <p className="text-[17px] font-medium text-text-h">
                  {poster && (
                    <Link
                      to={profilePath(poster.username)}
                      className={`rounded no-underline hover:underline ${focusRing}`}
                    >
                      @{poster.username}
                    </Link>
                  )}
                  {poster && posted && <span className="px-1.5">·</span>}
                  {posted && <span className="text-[15px] opacity-70">{posted}</span>}
                </p>
              </div>
            )}

            {/* The caption, or nothing. crumbLabel() stands in the date when a
                crumb has none, which is right on the canvas — a photo with no
                words still needs a label there — but here it would print the date
                a second time, directly under the line above that already says
                when it was posted. So the caption is taken as the caption. */}
            {caption && (
              <figcaption className="max-w-[min(90vw,40rem)] text-[15px] break-words text-text-h">
                {caption}
              </figcaption>
            )}

            {error?.crumbId === crumb.id && (
              <p role="alert" className="text-[15px] text-danger">
                {error.message}
              </p>
            )}

            </figure>
        )}
      </dialog>

      <Modal
        open={confirming}
        onClose={() => (busy ? undefined : setConfirming(false))}
        title="Delete this crumb?"
      >
        <div className="space-y-4">
          <p className="text-[15px] text-text">
            This photo
            {caption && <> captioned &ldquo;{caption}&rdquo;</>} will be gone. This
            cannot be undone.
          </p>

          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={busy}>
              Keep it
            </Button>
            <Button variant="danger" onClick={() => void remove()} disabled={busy}>
              <Trash01 size={16} strokeWidth={1.75} />
              {busy ? 'Deleting…' : 'Delete it'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
