import { z } from 'zod'
import { api } from './api'
import {
  collectionEnvelopeSchema,
  collectionListSchema,
  collectionOptionSchema,
  collectionPayloadSchema,
  collectionSchema,
  createCollectionSchema,
  DEFAULT_FILTERS,
  searchFiltersSchema,
  widgetSchema,
} from './collectionSchemas'
import type {
  Collection,
  CollectionOption,
  CollectionStatus,
  CreateCollectionInput,
  Pagination,
  SearchFilters,
  Widget,
} from './collectionSchemas'

export * from './collectionSchemas'

// The server takes filters as a query string. Empty values are left out so the
// server applies its own defaults rather than our empty strings.
function toQuery(filters: SearchFilters): Record<string, string | number> {
  const query: Record<string, string | number> = { page: filters.page }

  if (filters.q) query.q = filters.q
  if (filters.scope !== 'all') query.scope = filters.scope
  if (filters.status.length) query.status = filters.status.join(',')
  if (filters.tags.length) query.tags = filters.tags.join(',')
  if (filters.has.length) query.has = filters.has.join(',')
  if (filters.dateFrom) query.dateFrom = filters.dateFrom
  if (filters.dateTo) query.dateTo = filters.dateTo
  if (filters.sort !== 'recent') query.sort = filters.sort

  return query
}

export async function fetchCollectionsPage(page = 1, limit = 24): Promise<{
  collections: Collection[]
  pagination: Pagination
}> {
  const { data } = await api.get('/api/collections', { params: { page, limit } })
  return collectionListSchema.parse(data)
}

export async function searchCollections(filters: SearchFilters): Promise<{
  collections: Collection[]
  pagination: Pagination
}> {
  const { data } = await api.get('/api/collections/search', {
    params: toQuery(filters),
  })
  return collectionListSchema.parse(data)
}

export async function fetchUpcoming(days = 30, limit = 10): Promise<{
  collections: Collection[]
  pagination: Pagination
}> {
  const { data } = await api.get('/api/collections/upcoming', {
    params: { days, limit },
  })
  return collectionListSchema.parse(data)
}

export async function fetchCollection(id: string): Promise<{
  collection: Collection
  widgets: unknown[]
}> {
  const { data } = await api.get(`/api/collections/${id}`)
  return collectionPayloadSchema.parse(data)
}

// Collections the signed-in user can file a crumb into: the ones they created
// plus the ones shared with them. A collection they cannot edit is not worth
// offering, and the server would refuse it anyway.
export async function fetchCollectionOptions(): Promise<CollectionOption[]> {
  const { data } = await api.get('/api/collections', { params: { limit: 50 } })
  return z
    .object({ collections: z.array(collectionOptionSchema) })
    .parse(data)
    .collections
}

// Opening a collection with nothing in it is allowed: it starts as "new" and
// becomes a draft once anything is added. If the user then leaves without
// adding anything, the caller should delete it (see the README business rules).
export async function createCollection(input: CreateCollectionInput): Promise<Collection> {
  const body = createCollectionSchema.parse(input)
  const { data } = await api.post('/api/collections', body)
  return collectionEnvelopeSchema.parse(data).collection
}

export async function updateCollection(
  id: string,
  input: Partial<CreateCollectionInput>,
): Promise<Collection> {
  const { data } = await api.patch(`/api/collections/${id}`, input)
  return collectionEnvelopeSchema.parse(data).collection
}

export async function setCollectionStatus(id: string, status: CollectionStatus): Promise<Collection> {
  const { data } = await api.patch(`/api/collections/${id}/status`, { status })
  return collectionEnvelopeSchema.parse(data).collection
}

export async function deleteCollection(id: string): Promise<void> {
  await api.delete(`/api/collections/${id}`)
}

export async function shareCollection(id: string, userId: string): Promise<Collection> {
  const { data } = await api.post(`/api/collections/${id}/collaborators`, { userId })
  return collectionEnvelopeSchema.parse(data).collection
}

export async function unshareCollection(id: string, userId: string): Promise<Collection> {
  const { data } = await api.delete(`/api/collections/${id}/collaborators/${userId}`)
  return collectionEnvelopeSchema.parse(data).collection
}

export { DEFAULT_FILTERS, searchFiltersSchema }
export type { SearchFilters }

// ---- Rows and widgets --------------------------------------------------------

export async function addRow(
  collectionId: string,
  name = '',
): Promise<{ collection: Collection; widgets: unknown[] }> {
  const { data } = await api.post(`/api/collections/${collectionId}/rows`, { name })
  return collectionPayloadSchema.parse(data)
}

export async function renameRow(
  collectionId: string,
  rowId: string,
  name: string,
): Promise<Collection> {
  const { data } = await api.patch(`/api/collections/${collectionId}/rows/${rowId}`, { name })
  return collectionEnvelopeSchema.parse(data).collection
}

export async function deleteRow(
  collectionId: string,
  rowId: string,
): Promise<Collection> {
  const { data } = await api.delete(`/api/collections/${collectionId}/rows/${rowId}`)
  return collectionEnvelopeSchema.parse(data).collection
}

export async function reorderRows(collectionId: string, order: string[]): Promise<Collection> {
  const { data } = await api.patch(`/api/collections/${collectionId}/rows/order`, { order })
  return collectionEnvelopeSchema.parse(data).collection
}

// `order` must list EVERY widget in that row, once each: the server rejects the
// request otherwise. It answers with every widget in the collection, already in
// display order, so callers replace their whole list rather than merging.
export async function reorderWidgets(
  collectionId: string,
  rowId: string,
  order: string[],
): Promise<Widget[]> {
  const { data } = await api.patch(`/api/collections/${collectionId}/rows/${rowId}/widgets/order`, {
    order,
  })
  return z.object({ widgets: z.array(widgetSchema) }).parse(data).widgets
}

export async function addWidget(
  collectionId: string,
  rowId: string,
  widget: NewWidget,
): Promise<{ widget: Widget; collection: Collection }> {
  const { data } = await api.post(`/api/collections/${collectionId}/rows/${rowId}/widgets`, widget)
  return z.object({ widget: widgetSchema, collection: collectionSchema }).parse(data)
}

export async function updateWidget(id: string, patch: Record<string, unknown>): Promise<Widget> {
  const { data } = await api.patch(`/api/widgets/${id}`, patch)
  return z.object({ widget: widgetSchema }).parse(data).widget
}

export async function deleteWidget(id: string): Promise<void> {
  await api.delete(`/api/widgets/${id}`)
}

export async function toggleChecklistItem(
  widgetId: string,
  itemId: string,
  done?: boolean,
): Promise<Widget> {
  const { data } = await api.patch(`/api/widgets/${widgetId}/checklist/${itemId}`, {
    ...(done === undefined ? {} : { done }),
  })
  return z.object({ widget: widgetSchema }).parse(data).widget
}

// Image widgets change their picture through their own endpoints: an image
// widget is created empty and the file is put in separately.
export async function uploadWidgetImage(widgetId: string, image: Blob): Promise<Widget> {
  const body = new FormData()
  body.append('image', image, 'upload.jpg')

  const { data } = await api.post(`/api/widgets/${widgetId}/image`, body)
  return z.object({ widget: widgetSchema }).parse(data).widget
}

export async function clearWidgetImage(widgetId: string): Promise<Widget> {
  const { data } = await api.delete(`/api/widgets/${widgetId}/image`)
  return z.object({ widget: widgetSchema }).parse(data).widget
}

export type NewWidget =
  | { type: 'notes'; body?: string }
  | { type: 'date'; date?: string | null; label?: string }
  | { type: 'image' }
  | { type: 'link'; url?: string | null }
