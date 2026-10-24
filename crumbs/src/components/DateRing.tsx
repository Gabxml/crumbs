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
 * would go wrong in dark mode. Drawn at 1:1 with the viewBox, so "6" on the
 * stroke is 6px on screen at the size it is used at on the poster rather than 6
 * scaled units; scaled down into a fanned tile the stroke thickens relative to
 * the ring, which is what keeps it reading as the same pen mark at both sizes.
 *
 * It fills whatever box it is put in, so the caller sizes the ring by sizing the
 * element around it and the number sits centred in it by the same box.
 */
export default function DateRing({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 112"
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 size-full text-danger ${className}`}
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