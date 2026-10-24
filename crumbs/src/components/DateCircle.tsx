/**
 * The date, ringed in a red circle drawn by hand.
 *
 * A perfect circle would read as a border on the card and nothing more. This one
 * is not: the curve is uneven all the way round, and it overlaps itself where it
 * starts and ends, which is what a pen does when it comes back to where it
 * began. Inline SVG because a div can only be straight, skewed, or a rounded
 * rectangle — none of which is a ring drawn by a hand.
 *
 * `currentColor` so the red follows the theme instead of being a fixed value that
 * would go wrong in dark mode. The path is drawn against a 120×112 box and the
 * ring fills whatever box it is given, so a caller sizes it by sizing the
 * element — the stroke thickens and thins with it, which is what keeps the pen
 * weight the same on a folder tile as it is on the full-size poster.
 *
 * Absolutely positioned and `size-full`, because the number it rings has to sit
 * dead centre in it whether it is one digit or two.
 */
export default function DateCircle() {
  return (
    <svg
      viewBox="0 0 120 112"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full text-danger"
    >
      <path
        d="M60 6C94 5 112 28 113 57C114 85 92 108 60 106C28 104 8 84 9 56C10 29 27 7 56 5C60 5 63 5 65 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  )
}