import { api } from './api'
import { passwordChangeSchema, profileSchema, userSchema } from './schemas'
import type { PasswordChangeInput, ProfileInput, User } from './schemas'

export async function updateProfile(input: ProfileInput): Promise<User> {
  const body = profileSchema.parse(input)
  const { data } = await api.patch('/api/auth/me', body)
  return userSchema.parse(data.user)
}

export async function changePassword(input: PasswordChangeInput): Promise<void> {
  const { currentPassword, newPassword } = passwordChangeSchema.parse(input)
  await api.post('/api/auth/password', { currentPassword, newPassword })
}

export { assetUrl as avatarSrc } from './api'

// The server takes the photo as multipart/form-data in a field named "image".
export async function uploadAvatar(image: Blob): Promise<User> {
  const body = new FormData()
  body.append('image', image, 'avatar.jpg')

  const { data } = await api.put('/api/auth/avatar', body)
  return userSchema.parse(data.user)
}

export async function removeAvatar(): Promise<User> {
  const { data } = await api.delete('/api/auth/avatar')
  return userSchema.parse(data.user)
}