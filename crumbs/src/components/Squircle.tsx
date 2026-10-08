import { Squircle as SquircleBase } from '@squircle-js/react'
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { RADIUS } from '../lib/ui'

// Figma's corner-smoothing default, which is the one Apple's own icons use.
const SMOOTHING = 0.6

/**
 * A true iOS superellipse.
 *
 * On Chromium the CSS in index.css takes the clip-path back and draws the curve
 * natively; everywhere else this component keeps the clip-path, so the shape is
 * the real thing in all of them. Reserve it for surfaces with a radius of 20px
 * or more. Below that a circular arc and a superellipse are hard to tell apart,
 * and the clip-path plus its ResizeObserver are not worth paying for — a plain
 * `rounded-control` gets the native upgrade for nothing.
 */
export default function Squircle({
  radius = RADIUS.card,
  className,
  ...props
}: {
  radius?: number
  className?: string
  children?: ReactNode
} & Omit<ComponentPropsWithoutRef<ElementType>, 'className'>) {
  return (
    <SquircleBase
      cornerRadius={radius}
      cornerSmoothing={SMOOTHING}
      className={`sq-clip ${className ?? ''}`}
      {...props}
    />
  )
}
