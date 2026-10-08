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
  className,
  children,
}: {
  as?: ElementType
  radius?: number
  floating?: boolean
  className?: string
  children?: ReactNode
}) {
  return (
    <Squircle
      as={Component}
      radius={radius}
      className={`bg-surface p-5 ${floating ? 'shadow-float' : ''} ${className ?? ''}`}
    >
      {children}
    </Squircle>
  )
}
