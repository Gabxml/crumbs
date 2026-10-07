import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import { assetUrl } from '../lib/api'
import { profilePath } from '../lib/people'
import type { CardTile, Collection, Person } from '../lib/collectionSchemas'
import { STATUS_LABELS } from '../lib/collectionSchemas'

const focusRing =
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

// "in 3 days" / "Today" / "2 days ago", from the number the server worked out.
function whenLabel(daysUntil: number | null | undefined): string {
  if (daysUntil === null || daysUntil === undefined) return ''
  if (daysUntil === 0) return 'Today'
  if (daysUntil === 1) return 'Tomorrow'
  if (daysUntil === -1) return 'Yesterday'
  if (daysUntil > 0) return `in ${daysUntil} days`
  return `${Math.abs(daysUntil)} days ago`
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function Tile({ tile }: { tile: CardTile }) {
  const base =
    'flex min-h-24 flex-col justify-end gap-1 rounded-md border border-border bg-accent-bg p-3 text-left'

  if (tile.type === 'image') {
    return (
      <div className={`${base} p-0`}>
        <img
          src={assetUrl(tile.url)}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-full rounded-md object-cover"
        />
      </div>
    )
  }

  if (tile.type === 'date') {
    return (
      <div className={base}>
        <span className="text-xs text-text">{whenLabel(tile.daysUntil)}</span>
        <span className="font-heading text-text-h">{formatDate(tile.date)}</span>
      </div>
    )
  }

  if (tile.type === 'note') {
    return (
      <div className={base}>
        <span className="line-clamp-3 text-sm text-text-h">{tile.text}</span>
      </div>
    )
  }

  return (
    <div className={base}>
      <span className="truncate text-sm text-text-h">{tile.title || tile.url}</span>
      {tile.siteName && <span className="truncate text-xs text-text">{tile.siteName}</span>}
    </div>
  )
}

// The owner's and collaborators' faces. The API describes a person without an
// email, and may have a null username for one whose account is gone, so the
// avatar falls back to a neutral mark rather than a blank. Each links to that
// person's profile.
function People({ owner, collaborators }: { owner: Person; collaborators: Person[] }) {
  const everyone = [owner, ...collaborators].filter((person) => person.username)
  if (everyone.length <= 1) return null

  return (
    <ul className="flex -space-x-2">
      {everyone.map((person) => (
        <li key={person.id} className="contents">
          <Link
            to={profilePath(person.username)}
            aria-label={`${person.username}'s profile`}
            className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <Avatar
              user={{
                username: person.username as string,
                firstName: person.firstName,
                lastName: person.lastName,
                avatarUrl: person.avatarUrl,
              }}
              className="size-6 text-xs"
            />
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function CollectionCard({
  collection,
  action,
  footerAction,
}: {
  collection: Collection
  action?: React.ReactNode
  footerAction?: React.ReactNode
}) {
  const { summary } = collection
  const others = collection.collaborators.length

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <header className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <h3 className="my-0! min-w-0 text-xl">
            <Link
              to={`/collections/${collection.id}`}
              className={`block truncate no-underline hover:underline ${focusRing}`}
            >
              {collection.title || 'Untitled collection'}
            </Link>
          </h3>
          {action}
        </div>

        <p className="flex flex-wrap items-center gap-2 text-sm text-text">
          <span className="rounded-full border border-border px-2 py-0.5 text-xs">
            {STATUS_LABELS[collection.status]}
          </span>
          {collection.isOverdue && <span className="text-xs text-accent">Overdue</span>}
          {others > 0 && (
            <span className="text-xs">
              {others === 1 ? '1 collaborator' : `${others} collaborators`}
            </span>
          )}
          {summary.imageCount > 0 && (
            <span className="text-xs">
              {summary.imageCount} {summary.imageCount === 1 ? 'memory' : 'memories'}
            </span>
          )}
        </p>
      </header>

      {summary.tiles.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {summary.tiles.slice(0, 4).map((tile, index) => (
            <Tile key={`${tile.type}-${index}`} tile={tile} />
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border p-3 text-sm text-text">
          Nothing in here yet.
        </p>
      )}

      {collection.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {collection.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-accent-bg px-2 py-0.5 text-xs text-text-h"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-auto flex items-center justify-between gap-2">
        <People owner={collection.owner} collaborators={collection.collaborators} />
        {footerAction}
      </footer>
    </article>
  )
}
