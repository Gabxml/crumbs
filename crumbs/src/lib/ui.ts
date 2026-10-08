// Shared style fragments. Kept as plain Tailwind class strings hoisted to
// module scope, which is the convention the rest of the app already uses, so
// they are statically visible to Tailwind's scanner.

/** Radius scale, in pixels. */
export const RADIUS = {
  card: 30,
  media: 20,
  control: 16,
} as const

/**
 * Focus ring. A 2px accent outline offset from the element, which stays put on
 * a squircle because corner-shape only alters the curve inside the corner box,
 * not the box itself.
 */
export const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

/**
 * Press feedback: scale down slightly on touch-down, spring back on release.
 * Shared by every tappable surface so the whole app answers a finger the same
 * way.
 */
export const pressable =
  'transition duration-200 ease-ios active:scale-[0.97] motion-reduce:active:scale-100'

/** Hover lift, for pointers only — a touch device has no hover to lift from. */
export const hoverLift = '[@media(hover:hover)]:hover:brightness-[0.98]'

/** Screen-reader-only text. */
export const srOnly = 'sr-only'
