import { useState } from 'react'
import { Link } from 'react-router-dom'
import { avatarSrc } from '../lib/profile'
import { fullName } from '../lib/user'
import { focusRing } from '../lib/ui'
import type { NamedUser } from '../lib/user'

// Soft pastels, used only as avatar fills. Everything saturated in the app comes
// from photography; the UI itself stays quiet, so these sit well below the
// accent in visual weight.
const PASTELS = [
  'bg-[#E4DCFB] text-[#4B3A8F]', // lavender
  'bg-[#D2F0E2] text-[#1F6B4C]', // mint
  'bg-[#FBE0D0] text-[#8A4A2B]', // peach
  'bg-[#D6EBFA] text-[#245C85]', // sky
]

/**
 * Same username, same colour, every render and every device — the fill is a
 * function of the name rather than something random that changes on reload.
 */
function pastel(username: string): string {
  let hash = 0
  for (let i = 0; i < username.length; i += 1) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0
  }
  return PASTELS[hash % PASTELS.length]
}

/**
 * A face, or the initial that stands in for one.
 *
 * A photo that cannot be shown falls back to the initial rather than to nothing.
 * The usual cause is a record pointing at a file that is no longer on disk, and
 * an <img> that fails leaves an empty box with a broken-image mark in it — so a
 * person whose photo has gone reads as a hole in the page, and as a loading one
 * that never finishes, which is worse than showing them as an initial they are
 * not wearing. `broken` is state rather than a ref so the fallback stays put:
 * without it every re-render would ask for the file again.
 *
 * Given a `to`, the face is the way to that person. It is a face and nothing
 * else at this size, so leaving it unclickable means a picture you can see is a
 * picture you cannot get closer to — the one thing a face in a list should be
 * for.
 */
export default function Avatar({
  user,
  className,
  ring = false,
  to,
}: {
  user: NamedUser
  className?: string
  /** A thin surface-coloured ring, for avatars that overlap each other. */
  ring?: boolean
  /** The person's profile. Omitted where the face is you, or already inside a link. */
  to?: string
}) {
  const [broken, setBroken] = useState(false)
  const photo = user.avatarUrl && !broken ? avatarSrc(user.avatarUrl) : null

  const face = photo ? (
    <img
      src={photo}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className={`size-full rounded-full object-cover ${className ?? ''} ${
        ring ? 'ring-2 ring-surface' : ''
      }`}
    />
  ) : (
    <div
      aria-hidden="true"
      className={`grid size-full select-none place-items-center rounded-full font-heading leading-none  ${pastel(user.username)} ${className ?? ''} ${ring ? 'ring-2 ring-surface' : ''}`}
    >
      {(fullName(user) || user.username).charAt(0).toUpperCase()}
    </div>
  )

  if (!to) return face

  return (
    <Link
      to={to}
      aria-label={`${user.username}'s profile`}
      className={`block size-full rounded-full ${focusRing}`}
    >
      {face}
    </Link>
  )
}

/** A round wrapper sized for a stack or a list row, since the avatar fills it. */
export function AvatarCircle({
  size,
  className,
  children,
}: {
  size: 'sm' | 'md' | 'lg'
  className?: string
  children: React.ReactNode
}) {
  const dimension = { sm: 'size-6 text-xs', md: 'size-10 text-base', lg: 'size-20 text-2xl' }[size]

  return <div className={`${dimension} shrink-0 ${className ?? ''}`}>{children}</div>
}
