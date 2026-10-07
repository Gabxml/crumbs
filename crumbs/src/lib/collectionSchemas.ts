import { z } from 'zod'

// ---- Collections -------------------------------------------------------------

// The five states a collection can be in. "new" is a blank one the user has
// just opened; it becomes a draft by itself once anything is added.
export const COLLECTION_STATUSES = ['new', 'draft', 'planned', 'done', 'archived'] as const
export const collectionStatusSchema = z.enum(COLLECTION_STATUSES)

export type CollectionStatus = z.infer<typeof collectionStatusSchema>

// A person as the API describes them: never an email.
export const personSchema = z.object({
  id: z.string(),
  username: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  avatarUrl: z.string().nullish(),
})

export type Person = z.infer<typeof personSchema>

// The card shows up to four tiles in the order date, note, image, link.
export const cardTileSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('date'),
    date: z.string(),
    dateStatus: z.enum(['past', 'today', 'upcoming']).nullish(),
    daysUntil: z.number().int().nullish(),
  }),
  z.object({ type: z.literal('note'), text: z.string() }),
  z.object({ type: z.literal('image'), url: z.string() }),
  z.object({
    type: z.literal('link'),
    url: z.string(),
    title: z.string().nullish(),
    image: z.string().nullish(),
    siteName: z.string().nullish(),
  }),
])

export type CardTile = z.infer<typeof cardTileSchema>

export const collectionSummarySchema = z.object({
  collectionDate: z.string().nullish(),
  collectionDates: z.array(z.string()),
  dateStatus: z.enum(['past', 'today', 'upcoming']).nullish(),
  daysUntil: z.number().int().nullish(),
  imageCount: z.number().int().nonnegative(),
  linkCount: z.number().int().nonnegative(),
  tiles: z.array(cardTileSchema),
})

export const collectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  status: collectionStatusSchema,
  owner: personSchema,
  collaborators: z.array(personSchema),
  rows: z.array(z.object({ id: z.string(), name: z.string() })),
  role: z.enum(['owner', 'collaborator']).nullish(),
  nextStatuses: z.array(collectionStatusSchema),
  isOverdue: z.boolean(),
  summary: collectionSummarySchema,
  createdAt: z.string(),
  updatedAt: z.string(),
})

export type Collection = z.infer<typeof collectionSchema>

export const paginationSchema = z.object({
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
})

export type Pagination = z.infer<typeof paginationSchema>

// Enough of a collection to fill the "add to a collection" picker. The full
// record is much bigger and the picker only needs a name to show.
export const collectionOptionSchema = collectionSchema.pick({ id: true, title: true })

export type CollectionOption = z.infer<typeof collectionOptionSchema>

export const collectionListSchema = z.object({
  collections: z.array(collectionSchema),
  pagination: paginationSchema,
})

export const collectionPayloadSchema = z.object({
  collection: collectionSchema,
  widgets: z.array(z.unknown()),
})

export const collectionEnvelopeSchema = z.object({ collection: collectionSchema })

// ---- Search ------------------------------------------------------------------

export const SORT_OPTIONS = [
  'recent',
  'newest',
  'oldest',
  'title',
  'date_asc',
  'date_desc',
] as const

export const sortSchema = z.enum(SORT_OPTIONS)

export type Sort = z.infer<typeof sortSchema>

export const WIDGET_TYPES = ['notes', 'date', 'image', 'link'] as const
export const widgetTypeSchema = z.enum(WIDGET_TYPES)

export type WidgetType = z.infer<typeof widgetTypeSchema>

export const SCOPES = ['all', 'mine', 'shared'] as const
export const scopeSchema = z.enum(SCOPES)

export type Scope = z.infer<typeof scopeSchema>

// What the Search form collects. Every field is optional and they combine
// with AND, which is what the server does.
export const searchFiltersSchema = z.object({
  q: z.string().trim().max(100, 'Search text is too long').default(''),
  scope: scopeSchema.default('all'),
  status: z.array(collectionStatusSchema).default([]),
  tags: z.array(z.string()).default([]),
  has: z.array(widgetTypeSchema).default([]),
  dateFrom: z.string().default(''),
  dateTo: z.string().default(''),
  sort: sortSchema.default('recent'),
  page: z.number().int().min(1).default(1),
})

export type SearchFilters = z.infer<typeof searchFiltersSchema>

export const DEFAULT_FILTERS: SearchFilters = {
  q: '',
  scope: 'all',
  status: [],
  tags: [],
  has: [],
  dateFrom: '',
  dateTo: '',
  sort: 'recent',
  page: 1,
}

export const createCollectionSchema = z.object({
  title: z.string().trim().max(80, 'Title must be at most 80 characters').default(''),
  description: z.string().trim().max(500, 'Description must be at most 500 characters').default(''),
  tags: z
    .array(z.string().trim().toLowerCase().min(1).max(24))
    .max(8, 'A collection can have at most 8 tags')
    .default([]),
})

// What a caller may send: the fields all have defaults, so any can be left out.
// z.input is what goes in; z.infer is what comes back out of .parse().
export type CreateCollectionInput = z.input<typeof createCollectionSchema>

export const STATUS_LABELS: Record<CollectionStatus, string> = {
  new: 'New',
  draft: 'Draft',
  planned: 'Planned',
  done: 'Done',
  archived: 'Archived',
}

// ---- Rows and widgets --------------------------------------------------------

export const checklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  done: z.boolean(),
})

export type ChecklistItem = z.infer<typeof checklistItemSchema>

const widgetBaseSchema = z.object({
  id: z.string(),
  collectionId: z.string(),
  rowId: z.string().nullish(),
  order: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const widgetSchema = z.discriminatedUnion('type', [
  widgetBaseSchema.extend({
    type: z.literal('notes'),
    body: z.string(),
    checklist: z.array(checklistItemSchema),
  }),
  widgetBaseSchema.extend({
    type: z.literal('date'),
    date: z.string().nullish(),
    label: z.string(),
    dateStatus: z.enum(['past', 'today', 'upcoming']).nullish(),
    daysUntil: z.number().int().nullish(),
  }),
  widgetBaseSchema.extend({
    type: z.literal('image'),
    image: z
      .object({
        url: z.string(),
        originalName: z.string().nullish(),
        mimeType: z.string(),
        size: z.number().int(),
      })
      .nullish(),
  }),
  widgetBaseSchema.extend({
    type: z.literal('link'),
    url: z.string().nullish(),
    embedUrl: z.string().nullish(),
    preview: z
      .object({
        status: z.enum(['ok', 'unavailable']),
        title: z.string().nullish(),
        description: z.string().nullish(),
        image: z.string().nullish(),
        siteName: z.string().nullish(),
        favicon: z.string().nullish(),
      })
      .nullish(),
  }),
])

export type Widget = z.infer<typeof widgetSchema>
export type WidgetOfType<T extends Widget['type']> = Extract<Widget, { type: T }>

export const rowSchema = z.object({ id: z.string(), name: z.string() })

export type Row = z.infer<typeof rowSchema>
