import { api, ApiError } from './api'
import { loginSchema, registerSchema, userSchema } from './schemas'
import type { LoginInput, RegisterInput, User } from './schemas'

const authResponseSchema = (user: unknown) => ({ user: userSchema.parse(user) })

export async function register(input: RegisterInput): Promise<User> {
  const body = registerSchema.parse(input)
  const { data } = await api.post('/api/auth/register', body)
  return authResponseSchema(data.user).user
}

export async function login(input: LoginInput): Promise<User> {
  const body = loginSchema.parse(input)
  const { data } = await api.post('/api/auth/login', body)
  return authResponseSchema(data.user).user
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout')
}

export async function fetchMe(): Promise<User | null> {
  try {
    const { data } = await api.get('/api/auth/me')
    return authResponseSchema(data.user).user
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null
    }
    throw error
  }
}
