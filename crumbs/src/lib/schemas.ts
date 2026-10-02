import { z } from 'zod'

export const healthSchema = z.object({
  status: z.literal('ok'),
  database: z.enum(['connected', 'disconnected', 'unknown']),
  uptime: z.number().nonnegative(),
  timestamp: z.string(),
})

export type Health = z.infer<typeof healthSchema>

export const userSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  createdAt: z.string(),
})

export type User = z.infer<typeof userSchema>

export const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(20, 'Username must be at most 20 characters')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Username can only contain letters, numbers and underscores',
  )

export const registerSchema = z.object({
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export type RegisterInput = z.infer<typeof registerSchema>

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export type LoginInput = z.infer<typeof loginSchema>

export const crumbSchema = z.object({
  title: z.string().min(1, 'Give it a title').max(80, 'Keep it under 80 characters'),
  note: z.string().max(500, 'Keep it under 500 characters'),
})

export type CrumbInput = z.infer<typeof crumbSchema>
