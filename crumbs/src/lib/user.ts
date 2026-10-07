import type { User } from './schemas'

export type NamedUser = Pick<User, 'username' | 'firstName' | 'lastName' | 'avatarUrl'>

export function fullName(user: Pick<User, 'firstName' | 'lastName'>): string {
  return [user.firstName, user.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}