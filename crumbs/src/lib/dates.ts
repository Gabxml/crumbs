// Date wording, kept in one place so the same collection date reads the same way
// on a folder card, inside a fanned tile and on a widget poster.

/**
 * "in 3 days" / "Today" / "2 days ago", from the number the server worked out.
 * An absent number means the collection has no date at all, which is not the
 * same as being due today, so it renders as nothing rather than as "Today".
 */
export function whenLabel(daysUntil: number | null | undefined): string {
  if (daysUntil === null || daysUntil === undefined) return ''
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  if (daysUntil === -1) return 'Yesterday'
  if (daysUntil > 0) return `in ${daysUntil} days`
  return `${Math.abs(daysUntil)} days ago`
}

/**
 * A plain calendar date as a medium-formatted day. The value is a `YYYY-MM-DD`
 * with no zone, so it is parsed without one and read back in UTC — parsing it as
 * local time is what makes a collection dated on the 1st show as the last day
 * of the previous month for anyone west of Greenwich.
 */
export function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(
    date,
  )
}

/**
 * A `YYYY-MM-DD` pulled into the three parts a calendar page is made of: the
 * month across the top, the day in the middle, the year underneath. Read in UTC
 * for the same reason `formatDate` does, and empty strings come back for
 * anything missing or unreadable, so a caller asks whether the day is there
 * instead of parsing the value a second time.
 */
export function splitDate(value: string | null | undefined): {
  month: string
  day: string
  year: string
} {
  if (!value) return { month: '', day: '', year: '' }
  const date = new Date(`${value}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return { month: '', day: '', year: '' }
  const format = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(date)
  return {
    month: format({ month: 'long' }),
    day: format({ day: 'numeric' }),
    year: format({ year: 'numeric' }),
  }
}

/**
 * A steady per-id tilt in degrees, so a row of cards is scattered the same way
 * on every render and on every device. The tail of the id is used because the
 * front of it is a timestamp and never varies.
 */
export function tiltFor(id: string, spread = 13): number {
  const tail = Number.parseInt(id.slice(-4), 16)
  if (Number.isNaN(tail)) return 0
  return (tail % spread) - (spread - 1) / 2
}