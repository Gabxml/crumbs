import { z } from 'zod'
import { api } from './api'
import type { User } from './schemas'

export type NamedUser = Pick<User, 'username' | 'firstName' | 'lastName' | 'avatarUrl'>

export const publicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  firstName: z.string().nullish(),
  lastName: z.string().nullish(),
  avatarUrl: z.string().nullish(),
})

export type PublicUser = z.infer<typeof publicUserSchema>

export function fullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}

export async function fetchUser(userId: string): Promise<PublicUser> {
  const { data } = await api.get(`/api/users/id/${userId}`)
  return publicUserSchema.parse(data.user)
}