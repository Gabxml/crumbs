import { Squircle as SquircleBase } from '@squircle-js/react'
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react'
import { RADIUS } from '../lib/ui'
import { SMOOTHING } from '../lib/squircle'

/**
 * A true iOS superellipse.
 *
 * On Chromium the CSS in index.css upgrades every named radius to a native
 * squircle; everywhere else this component keeps the clip-path, so the shape is
 * the real thing in all of them. Reserve it for surfaces with a radius of 20px
 * or more. Below that a circular arc and a superellipse are hard to tell apart,
 * and the clip-path plus its ResizeObserver are not worth paying for — a plain
 * `rounded-control` gets the native upgrade for nothing.
 *
 * For a surface with many instances of one size, `squircleClip` in lib/squircle
 * draws the same shape as a string instead, which costs one path rather than one
 * each.
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
