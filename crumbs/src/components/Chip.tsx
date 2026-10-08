import { focusRing, pressable } from '../lib/ui'

/**
 * A filter or tag pill. Fully round, on the subtle fill when idle and on an
 * accent tint when selected — which is also what makes a selected chip readable
 * at a glance without adding a second hue.
 */
export default function Chip({
  selected = false,
  className,
  ...props
}: {
  selected?: boolean
  className?: string
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>) {
  const tone = selected
    ? 'bg-accent-tint text-on-accent'
    : 'bg-fill text-text hover:brightness-[0.97]'

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium ${tone} ${focusRing} ${pressable} ${className ?? ''}`}
      {...props}
    />
  )
}

/**
 * The static form: a tag on a card, a status. Not interactive, so no ring and
 * no press state — a thing that looks tappable but is not is worse than one that
 * does not.
 */
export function ChipLabel({
  tone = 'fill',
  className,
  ...props
}: {
  tone?: 'fill' | 'accent' | 'danger'
  className?: string
} & Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>) {
  const fill =
    tone === 'accent'
      ? 'bg-accent-tint text-on-accent'
      : tone === 'danger'
        ? 'bg-accent-tint text-danger'
        : 'bg-fill text-text'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-medium ${fill} ${className ?? ''}`}
      {...props}
    />
  )
}
