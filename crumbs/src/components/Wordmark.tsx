import { Link } from 'react-router-dom'
import { focusRing, pressable } from '../lib/ui'

/**
 * The wordmark, as the mark and nothing else.
 *
 * The SVG is drawn with `stroke="black"`, so it is used as a mask and painted
 * in `--wordmark` rather than loaded as an <img> — one file, and the theme
 * decides the colour. The mark carries the name on its own, so the link is
 * labelled for anyone who cannot see it and the shape itself is hidden from
 * assistive tech.
 */
export default function Wordmark({
  to = '/',
  className = 'w-[124px]',
}: {
  /**
   * Where the mark goes, or null when it is not a link at all.
   *
   * Null is for the mark standing in for the word inside a line of text. A link
   * to the page you are already on is a tab stop that goes nowhere, and inside a
   * heading it would be announced as part of the title.
   */
  to?: string | null
  /** Width only: the height follows from the file's own aspect ratio. */
  className?: string
}) {
  if (to === null) {
    // Named rather than hidden: this mark IS the first word of the heading it
    // sits in, so dropping it from the accessible name would drop "Crumbs" from
    // the page's title.
    //
    // `--wordmark: currentColor` so it takes the colour of the text it is part
    // of rather than the theme's own logo colour, which is an accent blue chosen
    // to sit on a white surface and vanishes against a light one.
    return (
      <span
        role="img"
        aria-label="Crumbs"
        className={`wordmark block ${className}`}
        style={{ '--wordmark': 'currentColor' } as React.CSSProperties}
      />
    )
  }

  return (
    <Link
      to={to}
      aria-label="Crumbs"
      className={`block shrink-0 no-underline ${focusRing} ${pressable} ${className}`}
    >
      <span aria-hidden="true" className="wordmark block" />
    </Link>
  )
}