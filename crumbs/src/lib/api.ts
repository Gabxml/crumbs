import axios from 'axios'
import { healthSchema } from './schemas'
import type { Health } from './schemas'

const baseURL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : '')

// No default Content-Type. Axios sets `application/json` by itself for plain
// object bodies, and a default here would BREAK file uploads: seeing
// `application/json` on a FormData body, axios rewrites the FormData into JSON
// instead of sending multipart, and the server finds no file. Leave it unset
// and both kinds of request work.
export const api = axios.create({
  baseURL,
  timeout: 10_000,
  withCredentials: true,
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
  const { data } = await api.get('/api/health')
  return healthSchema.parse(data)
}

// Turns an API path like "/api/crumbs/<id>/image" into something the browser
// can load. In development the API is on a different port; in production the
// host proxies /api to the backend, so the base URL is empty. Absolute URLs
// are left alone.
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined

  // Absolute picture URLs are only ever produced by the backend for link
  // previews. Restricting the scheme means a bad value can never become a
  // script URL if this helper is reused somewhere other than an <img src>.
  if (/^https?:\/\//i.test(path)) return path

  // Same-origin paths only. "//host" is protocol-relative and some browsers
  // treat a backslash as a slash, so both could silently point off-site.
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\')) {
    return undefined
  }

  return `${api.defaults.baseURL ?? ''}${path}`
}
