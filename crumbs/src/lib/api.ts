import axios from 'axios'
import { healthSchema } from './schemas'
import type { Health } from './schemas'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL,
  timeout: 10_000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export class ApiError extends Error {
  readonly status: number
  readonly fields: Record<string, string[]>

  constructor(message: string, status: number, fields: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        const data = error.response.data as {
          message?: string
          fields?: Record<string, string[]>
        }
        return Promise.reject(
          new ApiError(
            data?.message ?? `Request failed: ${error.response.status}`,
            error.response.status,
            data?.fields ?? {},
          ),
        )
      }
      return Promise.reject(new ApiError('Cannot reach the server', 0, {}))
    }
    return Promise.reject(new ApiError('Unexpected error', 0, {}))
  },
)

export async function fetchHealth(): Promise<Health> {
  const { data } = await api.get('/health')
  return healthSchema.parse(data)
}
