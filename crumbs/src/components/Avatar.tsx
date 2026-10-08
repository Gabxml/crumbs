import { avatarSrc } from '../lib/profile'
import { fullName } from '../lib/user'
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

export default function Avatar({
  user,
  className,
  ring = false,
}: {
  user: NamedUser
  className?: string
  /** A thin surface-coloured ring, for avatars that overlap each other. */
  ring?: boolean
}) {
  const size = `size-full object-cover ${className ?? ''}`

  if (user.avatarUrl) {
    return (
      <img
        src={avatarSrc(user.avatarUrl)}
        alt=""
        loading="lazy"
        className={`${size} rounded-full ${ring ? 'ring-2 ring-surface' : ''}`}
      />
    )
  }

  const initial = (fullName(user) || user.username).charAt(0).toUpperCase()

  return (
    <div
      aria-hidden="true"
      className={`grid size-full select-none place-items-center rounded-full font-heading leading-none ${pastel(user.username)} ${className ?? ''} ${ring ? 'ring-2 ring-surface' : ''}`}
    >
      {initial}
    </div>
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
