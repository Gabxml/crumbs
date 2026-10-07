import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import { ApiError } from '../lib/api'
import { profilePath, sendFriendRequest } from '../lib/people'
import type { SearchHit } from '../lib/people'
import { fullName } from '../lib/user'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

const RELATIONSHIP_TEXT: Record<SearchHit['relationship'], string> = {
  friends: 'Friends',
  request_sent: 'Request sent',
  request_received: 'Wants to be friends',
  none: 'Not friends',
}

// Avatar needs a real string for the initial it falls back to. A hit with no
// username cannot be linked to, so it renders with a placeholder.
function withUsername(hit: SearchHit) {
  return { ...hit, username: hit.username ?? '?' }
}

// One person in a search result: who they are, how you are connected, and the
// one action worth offering. Links through to their profile.
export default function PersonRow({ hit }: { hit: SearchHit }) {
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const request = async () => {
    setBusy(true)
    setError(null)
    try {
      await sendFriendRequest(hit.id)
      setSent(true)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not send the request.',
      )
    } finally {
      setBusy(false)
    }
  }

  const name = fullName(hit)
  const canRequest = hit.relationship === 'none' && !sent

  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <Avatar user={withUsername(hit)} className="size-9" />

      <span className="min-w-0 flex-1">
        <Link
          to={profilePath(hit.username)}
          className={`block truncate no-underline hover:underline ${focusRing}`}
        >
          {hit.username ? `@${hit.username}` : 'Someone'}
        </Link>
        {name && <span className="block truncate text-sm text-text">{name}</span>}
      </span>

      <span className="text-xs text-text">
        {sent ? 'Request sent' : RELATIONSHIP_TEXT[hit.relationship]}
      </span>

      {canRequest && (
        <button
          type="button"
          onClick={() => void request()}
          disabled={busy}
          className={`rounded-md border border-border px-2 py-1 font-sans text-sm text-text disabled:opacity-50 ${focusRing}`}
        >
          {busy ? 'Sending…' : 'Add friend'}
        </button>
      )}

      {error && (
        <span role="alert" className="w-full text-xs text-accent">
          {error}
        </span>
      )}
    </li>
  )
}
