import axios from 'axios'
import { healthSchema } from './schemas'
import type { Health } from './schemas'

const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000'

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
  const { data } = await api.get('/health')
  return healthSchema.parse(data)
}

// Turns an API path like "/uploads/x.jpg" into something the browser can load.
//
// The API is on a different origin from the page (5173 in dev, 3000 for the
// API), so a relative path would be fetched from VITE_API_BASE_URL's absence —
// that is, from the dev server, which answers unknown paths with index.html.
// The result is a 200 with text/html where an image was expected, so the
// picture silently fails to render. Absolute URLs are left alone.
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined
  if (/^(https?:)?\/\//.test(path) || path.startsWith('data:')) return path
  return `${api.defaults.baseURL ?? ''}${path}`
}
