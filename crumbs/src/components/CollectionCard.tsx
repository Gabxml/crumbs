import { Link } from 'react-router-dom'
import Avatar from './Avatar'
import Card from './Card'
import { ChipLabel } from './Chip'
import { assetUrl } from '../lib/api'
import { profilePath } from '../lib/people'
import { focusRing, RADIUS } from '../lib/ui'
import Squircle from './Squircle'
import type { CardTile, Collection, Person } from '../lib/collectionSchemas'
import { STATUS_LABELS } from '../lib/collectionSchemas'

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

/**
 * One preview of a collection's contents. Images keep their own squircle crop; the
 * other kinds sit on the subtle fill so a card of pure text still reads as a grid
 * rather than as a stack of loose fragments.
 */
function Tile({ tile }: { tile: CardTile }) {
  if (tile.type === 'image') {
    return (
      <Squircle
        radius={RADIUS.media}
        className="overflow-hidden bg-fill"
      >
        <img
          src={assetUrl(tile.url)}
          alt=""
          loading="lazy"
          className="aspect-[4/3] w-full object-cover"
        />
      </Squircle>
    )
  }

  const base = 'flex min-h-24 flex-col justify-end gap-1 rounded-media bg-fill p-3 text-left'

  if (tile.type === 'date') {
    return (
      <div className={base}>
        <span className="text-[13px] text-text">{whenLabel(tile.daysUntil)}</span>
        <span className="text-[15px] font-medium text-text-h">{formatDate(tile.date)}</span>
      </div>
    )
  }

  if (tile.type === 'note') {
    return (
      <div className={base}>
        <span className="line-clamp-3 text-[15px] text-text-h">{tile.text}</span>
      </div>
    )
  }

  return (
    <div className={base}>
      <span className="truncate text-[15px] font-medium text-text-h">{tile.title || tile.url}</span>
      {tile.siteName && <span className="truncate text-[13px] text-text">{tile.siteName}</span>}
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
            className={`rounded-full ${focusRing}`}
          >
            <div className="size-7">
              {/* The ring separates overlapping faces from each other and from
                  whatever sits behind them. */}
              <Avatar
                user={{
                  username: person.username as string,
                  firstName: person.firstName,
                  lastName: person.lastName,
                  avatarUrl: person.avatarUrl,
                }}
                ring
              />
            </div>
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
    <Card as="article" className="flex h-full flex-col gap-3">
      <header className="space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-[17px] font-semibold tracking-heading">
            <Link
              to={`/collections/${collection.id}`}
              className={`block truncate text-text-h no-underline ${focusRing}`}
            >
              {collection.title || 'Untitled collection'}
            </Link>
          </h3>
          {action}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ChipLabel>{STATUS_LABELS[collection.status]}</ChipLabel>
          {collection.isOverdue && <ChipLabel tone="danger">Overdue</ChipLabel>}
          {others > 0 && (
            <span className="text-[13px] text-text">
              {others === 1 ? '1 collaborator' : `${others} collaborators`}
            </span>
          )}
          {summary.imageCount > 0 && (
            <span className="text-[13px] text-text">
              {summary.imageCount} {summary.imageCount === 1 ? 'memory' : 'memories'}
            </span>
          )}
        </div>
      </header>

      {summary.tiles.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {summary.tiles.slice(0, 4).map((tile, index) => (
            <Tile key={`${tile.type}-${index}`} tile={tile} />
          ))}
        </div>
      ) : (
        <p className="rounded-media bg-fill p-4 text-[15px] text-text">Nothing in here yet.</p>
      )}

      {collection.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {collection.tags.map((tag) => (
            <li key={tag}>
              <ChipLabel>{tag}</ChipLabel>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-auto flex items-center justify-between gap-2 pt-1">
        <People owner={collection.owner} collaborators={collection.collaborators} />
        {footerAction}
      </footer>
    </Card>
  )
}
