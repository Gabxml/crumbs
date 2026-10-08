import { useState } from 'react'
import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import { ApiError } from '../lib/api'
import { profilePath, sendFriendRequest } from '../lib/people'
import type { SearchHit } from '../lib/people'
import { fullName } from '../lib/user'
import Button from './Button'
import { ChipLabel } from './Chip'
import { focusRing } from '../lib/ui'

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
    <li className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="size-10 shrink-0">
        <Avatar user={withUsername(hit)} />
      </div>

      <span className="min-w-0 flex-1">
        <Link
          to={profilePath(hit.username)}
          className={`block truncate text-text-h no-underline ${focusRing}`}
        >
          {hit.username ? `@${hit.username}` : 'Someone'}
        </Link>
        {name && <span className="block truncate text-[14px] text-text">{name}</span>}
      </span>

      <ChipLabel tone={sent ? 'accent' : 'fill'}>
        {sent ? 'Request sent' : RELATIONSHIP_TEXT[hit.relationship]}
      </ChipLabel>

      {canRequest && (
        <Button variant="secondary" size="sm" onClick={() => void request()} disabled={busy}>
          {busy ? 'Sending…' : 'Add friend'}
        </Button>
      )}

      {error && (
        <span role="alert" className="w-full text-[13px] text-danger">
          {error}
        </span>
      )}
    </li>
  )
}
