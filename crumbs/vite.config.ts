import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import type { Plugin } from 'vite'
import tailwindcss from '@tailwindcss/vite'

const DEFAULT_API = 'http://localhost:3000'

function originOf(value: string | undefined): string {
  try {
    return new URL(value || DEFAULT_API).origin
  } catch {
    return DEFAULT_API
  }
}

// The page needs a different policy from the API: it loads modules, styles,
// pictures and websockets. `inline styles` covers React's style props (and, in
// development, the styles Vite injects).
function contentSecurityPolicy(apiOrigin: string, dev: boolean): string {
  return [
    "default-src 'self'",
    // Production has no inline scripts: the theme bootstrap is a file. Vite's
    // dev server injects an inline React-refresh preamble, so only dev needs
    // the exception.
    dev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    // Link previews may point at pictures on any website. Uploaded pictures are
    // same-origin API paths, plus data:/blob: for local previews.
    "img-src 'self' data: blob: https: http:",
    "font-src 'self' data:",
    // The API is a different origin. HMR needs a websocket in development.
    `connect-src 'self' ${apiOrigin}${dev ? ' ws:' : ''}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

function cspPlugin(apiOrigin: string, dev: boolean): Plugin {
  const value = contentSecurityPolicy(apiOrigin, dev)

  return {
    name: 'crumbs-csp',

    // Development: a real response header on the HTML document.
    configureServer(server) {
      server.middlewares.use((_req, res, next) => {
        res.setHeader('Content-Security-Policy', value)
        next()
      })
    },

    // Production: inject a meta tag. `frame-ancestors` cannot be set from a
    // meta tag, so the host should also send that one as a response header.
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        if (dev) return html
        return {
          html,
          tags: [
            {
              tag: 'meta',
              attrs: {
                'http-equiv': 'Content-Security-Policy',
                content: value.replace(/; frame-ancestors 'none'/, ''),
              },
              injectTo: 'head-prepend',
            },
          ],
        }
      },
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const dev = command === 'serve'
  const apiOrigin = originOf(env.VITE_API_BASE_URL)

  return {
    plugins: [react(), tailwindcss(), cspPlugin(apiOrigin, dev)],
  }
})
