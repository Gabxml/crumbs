import type { ElementType, ReactNode } from 'react'
import { RADIUS } from '../lib/ui'
import Squircle from './Squircle'

/**
 * A white panel on the grey canvas. Depth here is nothing but the contrast
 * between the two surfaces — no border, and no shadow unless the caller asks
 * for one with `floating`.
 */
export default function Card({
  as: Component = 'div',
  radius = RADIUS.card,
  floating = false,
  padded = true,
  className,
  children,
}: {
  as?: ElementType
  radius?: number
  floating?: boolean
  /**
   * The inset its contents sit inside. Turned off for a card that IS its
   * content — a photograph, which is cropped to the shape it is shown in rather
   * than framed by a margin of surface around it. A `p-0` in a caller's
   * `className` cannot do this job: two padding utilities in one class list are
   * decided by the order the stylesheet happens to emit them in, not by the order
   * they are written.
   */
  padded?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <Squircle
      as={Component}
      radius={radius}
      className={`bg-surface ${padded ? 'p-5' : ''} ${floating ? 'shadow-float' : ''} ${className ?? ''}`}
    >
      {children}
    </Squircle>
  )
}
