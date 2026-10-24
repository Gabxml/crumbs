# Crumbs — Review Cheatsheet

A reviewer's map of both halves of this repo. The per-project `README.md` files
are the setup docs and the full API reference; this is the "what am I looking at,
and what will bite me" version.

**Do not trust `crumbs/README.md` for routes or access rules — it is stale.**
See [Stale docs](#stale-docs).

---

## 1. The shape of it

```
crumbs-backend/   Express 5 + Mongoose on MongoDB Atlas. CommonJS, no build step. :3000
crumbs/           Vite 8 + React 19 + TypeScript + Tailwind v4. No test runner. :5173
```

Two independent npm projects. There is no monorepo tooling, no workspace, no shared
types — the contract between them is the JSON on the wire and the zod schemas in
`crumbs/src/lib/collectionSchemas.ts`.

The domain is small and nests four deep:

```
Collection  →  rows[]  →  widgets[]  →  (notes | date | image | link)
```

A **crumb** is a separate thing: a personal photo timeline, deliberately not a
collection image widget, because collections are shared and edited by several
people. An upload can produce both from one file.

---

## 2. Run and verify

| | Command | Needs |
|---|---|---|
| Backend | `npm start` / `npm run dev` | MongoDB, `.env` |
| Backend tests | `npm test` | **nothing** — `node --test`, no DB |
| Backend smoke | `npm run smoke` | a running server + `crumbs_dev` |
| Frontend | `npm run dev` | backend on :3000 |
| Frontend checks | `npx tsc -b --noEmit`, `npm run lint`, `npm run build` | nothing |

**The frontend has no tests.** `tsc` and `eslint` are the entire safety net, so
they must both pass before a change is done. The backend has 13 `node:test` files.

Node **20.12+** on both sides — the backend uses `process.loadEnvFile()`.

### Environment

| Where | Variables |
|---|---|
| `crumbs-backend/.env` | `PORT`, `NODE_ENV`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_ORIGIN`, `APP_TIMEZONE` |
| `crumbs/.env` | `VITE_API_BASE_URL` only — **never a secret**, `VITE_` is compiled into the bundle |

Two databases on the cluster, and `config/database.js` **refuses to boot** on a
mismatch: development must point at `crumbs_dev`, production at `crumbs`. This is
the single most important safety rail in the repo — do not weaken it to make
something work locally.

---

## 3. The seam — where the two halves meet

This is where most review time should go. Auth is a JWT in an **httpOnly cookie**,
the API is on `:3000` and the client on `:5173`, so **every request is cross-origin
with credentials**. Three consequences:

1. **`withCredentials: true`** on the axios instance, and CORS locked to
   `CLIENT_ORIGIN` with credentials allowed. Changing either without the other
   breaks sign-in in a way that looks like a 401 from nowhere.
2. **`assetUrl()` exists for a reason.** A relative `/uploads/x.jpg` asked of the
   Vite dev server returns **200 with `text/html`** — a 200 where an image was
   expected, so the picture silently never appears. Never render a raw asset path.
3. **Never return a `User` document.** `select: false` keeps `password` out of
   queries, and `.toPublic()` / `.toSummary()` are the only sanctioned shapes.
   Emails are never sent for anybody but yourself.

### Response shapes are not uniform

This is the most common source of real bugs. Each endpoint answers differently:

| Endpoint | Returns |
|---|---|
| `GET /api/collections/:id` | `{ collection, widgets }` |
| `POST /api/collections/:id/rows` | `{ collection }` — **no `widgets`** |
| `POST /api/collections/:id/rows/:rowId/widgets` | `{ widget, collection }` |
| `PATCH .../widgets/order` | `{ widgets }` — the **whole collection's** widgets |
| `POST /api/auth/logout`, `POST /api/auth/password` | `204`, no body |

Parse with the schema that matches the endpoint. `addRow` was parsing
`POST /rows` with `collectionPayloadSchema` (which *requires* `widgets`), so zod
threw, the promise rejected into nothing, and **new rows only appeared after a
page reload.**

### Reorder endpoints want the whole list

`assertSameIds` rejects any `order` that is not every id exactly once. So a move
rebuilds the full array locally rather than sending the pair that swapped.

---

## 4. Frontend cheatsheet

```
src/
├── App.tsx            route table + the row layout (sidebar rail | page column)
├── index.css          the design system: @theme tokens + shape/sheet rules
├── lib/
│   ├── api.ts         axios instance, ApiError, assetUrl()
│   ├── collectionSchemas.ts   the wire contract, as zod
│   ├── collections.ts         every collection/row/widget call
│   ├── dates.ts        whenLabel, formatDate, tiltFor
│   └── ui.ts          RADIUS, focusRing, pressable, hoverLift
├── components/        23 — Button, Card, Field, Chip, Modal, Squircle, …
└── pages/             15 — one per route
```

### The design system is one file, and it is load-bearing

Every colour is a runtime custom property, so one `data-theme` attribute repaints
the app and **no component ever writes a `dark:` utility**. Adding one is a review
failure.

| Token | Use |
|---|---|
| `text-text-h` / `text-text` | primary / secondary text |
| `bg-surface` / `bg-fill` / `bg-bg` | card / subtle control / canvas |
| `text-accent`, `bg-accent-tint`, `text-on-accent` | the only accent, in three weights |
| `text-danger` | errors — **not** `text-accent`, which is orange |
| `border-inactive` | dashed borders and borders that appear on hover |

Shape: `rounded-card` 30px, `rounded-media` 20px, `rounded-control` 16px.
`rounded-full` is deliberately excluded from the squircle treatment — a circle
should stay a circle.

`lib/ui.ts` fragments (`focusRing`, `pressable`, `hoverLift`) are module-scope
strings on purpose, so Tailwind's scanner sees them statically.

### Conventions

- No semicolons, single quotes, 2-space indent, one component per file, default export.
- Every response goes through zod before it reaches state.
- `react-hook-form` is used on exactly four pages — `Login`, `Register`,
  `EditProfile`, `ResetPassword`. Everything else is plain `useState` + `ApiError`.
  Match whichever the file already does; do not introduce a third pattern.
- `Squircle` (a real superellipse via clip-path + ResizeObserver) is for surfaces
  of 20px and up. Below that it is not worth the cost — use `rounded-control`.

### Routes

| Path | Access |
|---|---|
| `/`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email` | public |
| `/collections`, `/collections/new`, `/collections/:id`, `/search`, `/crumbs`, `/u/:username`, `/profile`, `/edit-profile` | **sign-in required** (`RequireAuth`) |
| `/addevent` | legacy redirect to `/collections/new` |
| anything else | `NotFound` |

---

## 5. Backend cheatsheet

```
server.js    .env, connect, syncIndexes, listen
app.js       middleware + route mounting ONLY — no logic
routes/      parse input, shape output
services/    the rules live here
validators/  zod schemas (parseOrThrow)
middleware/  auth, upload, validateObjectId, errorHandler, notFound, logger
```

- CommonJS, double quotes, semicolons, 2-space indent.
- `throw new HttpError(status, message)` — never hand-write an error response.
  `middleware/errorHandler.js` formats it into `{ message, fields }`.
- Routes parse and shape; `services/` decides. A rule in a route file is misplaced.
- `usernameLower` is the unique key and `username` the display casing; a
  pre-validate hook keeps them in sync, so **never set either directly.**
- `services/imageFiles.js` owns file deletion. **One file can back both a crumb and
  an image widget** — deleting either record must not remove a file the other still
  needs. Use `crumbs.js:removeFileUnlessShared()`.

### Business rules that clients depend on

- **`status: 'new'` means "blank".** It is set on creation and promoted to `draft`
  the moment a title, tag, description or widget appears. It is the frontend's
  signal to delete a collection the user abandoned. Do not set `new` by hand.
- **`nextStatuses`** tells the client which status moves are currently legal. Build
  the dropdown from it so impossible moves are never offered.
- Legal moves: `draft → planned|archived`, `planned → draft|done|archived`,
  `done → planned|archived`, `archived → draft`. Anything else is `409`.
- `planned` requires at least one date widget; `done` requires every checklist item
  ticked.
- `summary.collectionDate` is the **earliest** date across all date widgets, and it
  drives sorting, "upcoming" and `isOverdue`.
- Dates are stored as `YYYY-MM-DD` **text**, never timestamps, so they cannot shift
  across timezones. "Today" comes from `APP_TIMEZONE`.
- `daysUntil`, `dateStatus`, `isOverdue` and `role` are derived on every read and
  **must not be persisted.**

---

## 6. Review checklist

**Any change touching the seam**

- [ ] Does the zod schema match the endpoint's actual response shape?
- [ ] Does a new endpoint need updating in `collectionSchemas.ts` (or the relevant schema)?
- [ ] Is the new field safe to hand to a user who is not the owner?
- [ ] Any new asset path rendered through `assetUrl()`?
- [ ] Any new file on disk — who deletes it, and is it shared with a crumb?

**Any frontend change**

- [ ] No `dark:` utility — colours are runtime tokens only.
- [ ] Errors use `text-danger`, not `text-accent`.
- [ ] Interactive elements carry `focusRing`; lists and dividers do not.
- [ ] Anything clickable is a real `<button>`/`<Link>` with a label if icon-only.
- [ ] Does state handling **append** new records as well as replace existing ones?
- [ ] `npx tsc -b --noEmit` and `npm run lint` both clean.

**Any React effect**

- [ ] Does it survive StrictMode's double mount? No destructive work in a bare
      unmount cleanup.
- [ ] Is `cancelled`/`AbortController` guarding against setting state after unmount?

---

## 7. Traps found in review

Concrete, not hypothetical. Each of these shipped.

| Trap | What happened |
|---|---|
| Response shape ≠ parser | `addRow` parsed `POST /rows` (returns `{collection}`) with a schema requiring `widgets`. Zod threw into an unhandled rejection; new rows appeared only after a reload. |
| Replace-only state merge | `replaceWidget` mapped over the list replacing by id. A newly created widget's id was absent, so it mapped to *unchanged* — created server-side, invisible client-side. |
| StrictMode double mount | A cleanup that deleted the collection on unmount fired on the first render in dev, deleting it instantly. Fixed by treating the first effect run as throwaway. |
| Tailwind cannot beat component CSS | `dialog.sheet[open]` sets `align-items` at specificity (0,2,1); an `items-center` utility is (0,1,0) and silently loses. Needed a real CSS rule. |
| `z-index` without `position` | A hover lift on overlapping cards did nothing. `relative` was missing. |
| Overriding a component's padding | `Card` hardcodes `p-5`; Tailwind emits `.p-5` **after** `.p-0`, so `<Card className="p-0">` does not remove padding. Give the component a prop instead. |
| Elevation on the grey canvas | `--fill` (#efefef) on `--bg` (#f2f2f2) is a 3-point difference — invisible. Cards need `bg-surface` and `shadow-float`, not `bg-fill`. |
| Modals inside transformed cards | A `<dialog>` nested in a `clip-path` + `rotate` + `overflow-hidden` card risks being clipped. `createPortal(..., document.body)` removes the question. |
| Vite's SPA fallback fakes a 200 | Requesting a deleted `.tsx` over the dev server returns **200 with `index.html`**. "Serves fine" is not proof a file exists — check the disk. |

---

## Stale docs

`crumbs/README.md` has drifted from the code. Trust it for setup; correct it for
everything else:

- Its route table marks `/collections`, `/search`, `/crumbs` and `/addevent` as
  **public**. All are wrapped in `RequireAuth`. Seven routes are wrong.
- It is missing `/collections/:id`, `/u/:username`, `/reset-password` and
  `/verify-email`.
- Its layout omits most of `lib/`, most of `components/`, and `hooks/ThemeProvider`.
- `main.tsx` wraps in `ThemeProvider` too, not just `BrowserRouter`/`AuthProvider`.
- It mentions a `border-border` utility; no border token exists any more.
- The backend README's layout omits `validators/widget.js`, `services/linkPreview.js`,
  `mailer.js`, `tokens.js`, `widgets.js`, `people.js`; its env table omits
  `APP_TIMEZONE`.

Dead code: `crumbs/src/components/CollectionCard.tsx` is no longer imported by
anything.