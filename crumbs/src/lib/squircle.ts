import { getSvgPath } from 'figma-squircle'
import { RADIUS } from './ui'

// Figma's corner-smoothing default, which is the one Apple's own icons use.
export const SMOOTHING = 0.6

/**
 * A superellipse clip-path for a square, as a `clip-path` value.
 *
 * The same shape the Squircle component draws, but as a string rather than an
 * element, for a surface that already knows its own size and has many instances
 * of it. A `Squircle` per tile means a resize listener and a path generation per
 * tile; this is one of each for the whole set, so the caller can hand it to a
 * CSS custom property and let every instance inherit it.
 *
 * The caller owns when it applies. Pair it with the `@supports not
 * (corner-shape: squircle)` rule in index.css and the browser draws the curve
 * natively wherever it can, which is both cheaper and one less string to parse.
 */
export function squircleClip(size: number, radius: number = RADIUS.media) {
  const path = getSvgPath({
    width: size,
    height: size,
    cornerRadius: radius,
    cornerSmoothing: SMOOTHING,
  })
  return `path('${path}')`
}
