import { z } from 'zod'
import { api } from './api'
import { crumbRecordSchema } from './schemas'
import { collectionSchema } from './collectionSchemas'
import type { Collection } from './collectionSchemas'

// How the signed-in user is connected to the person whose profile is open.
export const RELATIONSHIPS = ['self', 'friends', 'request_sent', 'request_received', 'none'] as const
export const relationshipSchema = z.enum(RELATIONSHIPS)

export type Relationship = z.infer<typeof relationshipSchema>

export const publicProfileSchema = z.object({
  id: z.string(),
  username: z.string(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  avatarUrl: z.string().nullish(),
  createdAt: z.string(),
  relationship: relationshipSchema,
  // Present only while a request is pending, so the page can accept or cancel it.
  requestId: z.string().nullish(),
  isSelf: z.boolean(),
  // null when you are not friends: the count is not yours to see. That is
  // different from 0, which would wrongly claim they have no friends.
  friendsCount: z.number().int().nonnegative().nullish(),
})

export type PublicProfile = z.infer<typeof publicProfileSchema>

export const profileCrumbsSchema = z.object({
  crumbs: z.array(crumbRecordSchema),
  truncated: z.boolean(),
})

// The URL of someone's profile. One place, so every avatar and name that links
// to a person builds the same path.
export function profilePath(username: string | null | undefined): string {
  return username ? `/u/${encodeURIComponent(username)}` : '/'
}

export async function fetchProfile(username: string): Promise<PublicProfile> {
  const { data } = await api.get(`/api/users/${encodeURIComponent(username)}`)
  return publicProfileSchema.parse(data.user)
}

// Friend-only. The server answers 404 to anyone who is not a friend, so a
// stranger's timeline simply does not exist as far as this call is concerned.
export type ProfileCrumbs = z.infer<typeof profileCrumbsSchema>

export async function fetchProfileCrumbs(username: string): Promise<ProfileCrumbs> {
  const { data } = await api.get(`/api/users/${encodeURIComponent(username)}/crumbs`)
  return profileCrumbsSchema.parse(data)
}

// Friend-only: the collections you are both part of.
export async function fetchProfileCollections(username: string): Promise<Collection[]> {
  const { data } = await api.get(`/api/users/${encodeURIComponent(username)}/collections`)
  return z.object({ collections: z.array(collectionSchema) }).parse(data).collections
}

// ---- Acting on a friendship --------------------------------------------------
// The endpoints already existed in routes/friends.js; until now nothing in the
// app called them, so there was no way to make a friend at all.

export async function sendFriendRequest(userId: string): Promise<void> {
  await api.post('/api/friends/requests', { userId })
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await api.patch(`/api/friends/requests/${requestId}/accept`)
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  await api.delete(`/api/friends/requests/${requestId}`)
}

export async function removeFriend(userId: string): Promise<void> {
  await api.delete(`/api/friends/${userId}`)
}

const searchHitSchema = z.object({
  id: z.string(),
  username: z.string().nullish(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  avatarUrl: z.string().nullish(),
  relationship: relationshipSchema.exclude(['self']),
})

export type SearchHit = z.infer<typeof searchHitSchema>

// Find people by username, to start a friendship from.
export async function searchPeople(q: string): Promise<SearchHit[]> {
  const { data } = await api.get('/api/friends/search', { params: { q } })
  return z.object({ users: z.array(searchHitSchema) }).parse(data).users
}
