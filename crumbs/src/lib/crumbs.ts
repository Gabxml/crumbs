import { z } from 'zod'
import { api } from './api'
import { crumbRecordSchema, crumbUploadResponseSchema } from './schemas'
import type { Crumb, CrumbResult } from './schemas'

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' })
const postedFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export { assetUrl as crumbSrc } from './api'

// The caption if there is one, otherwise the day it was uploaded.
export function crumbLabel(crumb: Crumb): string {
  const caption = crumb.caption.trim()
  if (caption) return caption
  const date = new Date(crumb.createdAt)
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date)
}

// The day it was uploaded, for somewhere that also says who posted it — the
// caption and the date are alternatives to each other, but the attribution is
// not, so the two sit side by side rather than one standing in for the other.
export function crumbPosted(crumb: Crumb): string {
  const date = new Date(crumb.createdAt)
  return Number.isNaN(date.getTime()) ? '' : postedFormat.format(date)
}

export async function fetchCrumbs(scope: 'mine' | 'all' = 'mine'): Promise<Crumb[]> {
  const { data } = await api.get('/api/crumbs', { params: { scope } })
  return z.object({ crumbs: z.array(crumbRecordSchema) }).parse(data).crumbs
}

// Uploads a photo as multipart/form-data: the server takes the picture in a
// field named "image", and the caption and collection alongside it.
export async function uploadCrumb(
  image: Blob,
  caption: string,
  collectionId: string | null = null,
): Promise<CrumbResult> {
  const body = new FormData()
  body.append('image', image, 'upload.jpg')
  const trimmed = caption.trim()
  if (trimmed) body.append('caption', trimmed)
  if (collectionId) body.append('collectionId', collectionId)

  const { data } = await api.post('/api/crumbs', body, { timeout: 60_000 })
  return crumbUploadResponseSchema.parse(data)
}

export async function deleteCrumb(id: string): Promise<void> {
  await api.delete(`/api/crumbs/${id}`)
}