# Crumbs — Frontend

The web client for Crumbs. Vite + React 19 + TypeScript, styled with Tailwind v4.

The API server is a separate project: [`crumbs-backend`](https://github.com/your-org/crumbs-backend). You need both running for the app to work.

## Requirements

- Node.js **20.12 or newer** — check with `node -v`. The backend uses `process.loadEnvFile()`, which does not exist on older versions.
- The backend running on `http://localhost:3000`.

## Setup

```bash
npm install
```

That is the whole setup. There is no required env file — the API URL defaults to `http://localhost:3000`.

To point at a different backend, copy the example and edit it:

```bash
cp .env.example .env
```

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Base URL of the API. |

Anything prefixed `VITE_` is compiled into the client bundle, so **never put a secret in this file** — it is readable by anyone who opens devtools.

## Run

```bash
npm run dev
```

Open the printed URL, usually `http://localhost:5173`. The home page shows `API ok · database connected` when it can reach the backend. If it says `Cannot reach the server`, the backend is not running or is on a different port.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server with hot reload |
| `npm run build` | Typecheck, then build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |

## Project layout

```
src/
├── main.tsx           entry point; wraps App in BrowserRouter and AuthProvider
├── App.tsx            route table
├── index.css          Tailwind import + @theme tokens
├── lib/
│   ├── api.ts         axios instance and the ApiError type
│   ├── auth.ts        register / login / logout / fetchMe
│   └── schemas.ts     zod schemas for API responses and forms
├── hooks/
│   ├── AuthProvider.tsx  holds the current user
│   └── useAuth.ts        context and hook
├── components/        RequireAuth, RedirectIfAuthed
└── pages/             one file per route
```

## Routes

| Path | Page | Access |
|---|---|---|
| `/` | Home | public |
| `/login` | Login | redirects to `/` if signed in |
| `/register` | Register | redirects to `/` if signed in |
| `/forgot-password` | Forgot password | redirects to `/` if signed in |
| `/collections` | Collections | public |
| `/search` | Search | public |
| `/addevent` | Add event | public |
| `/crumbs` | Crumbs | public |
| `/profile` | Profile | **sign-in required** |
| `/edit-profile` | Edit profile | **sign-in required** |
| anything else | 404 | public |

## Conventions

- No semicolons, single quotes, 2-space indent.
- One component per file, default export, filename matches the component.
- API responses are validated with zod before use — treat `healthSchema` and the auth schemas as the contract.
- Forms use `react-hook-form` with `zodResolver`; show errors next to the field.
- Styling is Tailwind utilities. Semantic colour classes (`text-text-h`, `bg-accent`, `border-border`) map to the CSS custom properties in `index.css`.

## Notes

- `strict` is **not** enabled in `tsconfig.app.json`. Turning it on will surface a batch of errors.
- Deep links like `/login` work in dev because Vite falls back to `index.html`. On a deployed host you must configure an SPA rewrite rule or they will 404 on refresh.
