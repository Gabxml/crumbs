import { z } from 'zod'
import { api, ApiError } from './api'
import { loginSchema, registerSchema, userSchema } from './schemas'
import type { LoginInput, RegisterInput, User } from './schemas'

const authResponseSchema = (user: unknown) => ({ user: userSchema.parse(user) })

// Registering does NOT sign you in: the address has to be confirmed first, so
// this reports whether the account was made and whether the mail went out.
export const registerResultSchema = z.object({
  user: userSchema,
  verificationEmailSent: z.boolean(),
})

export type RegisterResult = z.infer<typeof registerResultSchema>

export async function register(input: RegisterInput): Promise<RegisterResult> {
  const body = registerSchema.parse(input)
  const { data } = await api.post('/api/auth/register', body)
  return registerResultSchema.parse(data)
}

// The API answers a correct password with 403 when the address is not confirmed
// yet. That is a distinct next step, not a failure, so it gets its own error.
export class UnverifiedEmailError extends ApiError {
  constructor() {
    super('Confirm your email address before signing in', 403, {})
    this.name = 'UnverifiedEmailError'
  }
}

export async function login(input: LoginInput): Promise<User> {
  const body = loginSchema.parse(input)
  try {
    const { data } = await api.post('/api/auth/login', body)
    return authResponseSchema(data.user).user
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      throw new UnverifiedEmailError()
    }
    throw error
  }
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

// Consumes the emailed token and, because clicking that link proves you can
// receive mail, the server signs you in at the same time.
export async function verifyEmail(token: string): Promise<User> {
  const { data } = await api.post('/api/auth/verify-email', { token })
  return authResponseSchema(data.user).user
}

// Always resolves: the server answers the same way whether or not the address is
// on file, so it cannot be used to find out who has an account.
export async function resendVerification(email: string): Promise<void> {
  await api.post('/api/auth/resend-verification', { email })
}

export async function forgotPassword(email: string): Promise<void> {
  await api.post('/api/auth/forgot-password', { email })
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  await api.post('/api/auth/reset-password', { token, newPassword })
}
