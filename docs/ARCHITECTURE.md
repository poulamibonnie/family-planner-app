# Architecture

## High-Level Shape

Family Planner is a **Next.js 16 App Router** application. There is effectively no separate backend service — the "backend" is a layer of React Server Actions (`'use server'` functions in `lib/actions/`) plus one Route Handler for the Google OAuth callback. All persistence goes through Drizzle ORM to a Turso (libSQL) database.

```
Browser (React 19 client components)
        │
        │  direct calls to server actions  ┌──────────────────────────┐
        ├─────────────────────────────────▶│ lib/actions/*.ts          │
        │                                   │  'use server' functions   │
        │  GET /api/google/callback         │  - auth, todos, goals,    │
        ├─────────────────────────────────▶│    events, family, meals, │
        │                                   │    shopping, google       │
        │                                   └────────────┬──────────────┘
        │                                                │ Drizzle ORM
        │                                                ▼
        │                                   ┌──────────────────────────┐
        │                                   │ Turso / libSQL (SQLite)   │
        │                                   └──────────────────────────┘
        │
        │  external HTTP (server-side)
        ├──▶ Google OAuth + Calendar API (lib/google.ts)
        └──▶ Brevo REST email API (lib/actions/shopping.ts)
```

## Frontend

- **Rendering model:** Almost all interactive UI is in **client components** (`'use client'`). Pages under `app/dashboard/*` are client components that call server actions for data, rather than server components fetching at render. This was a deliberate trade-off for interactivity (optimistic-ish updates, tab switching, transitions).
- **Routing:**
  - `app/page.tsx` — public landing page
  - `app/login`, `app/register` — auth pages
  - `app/dashboard/layout.tsx` — auth gate + Navbar + `UserContext` provider
  - `app/dashboard/page.tsx` — redirect/entry to dashboard
  - `app/dashboard/self/page.tsx` — **Self mode** (personal: Today, This Week, Year Goals, Reminders, Progress)
  - `app/dashboard/family/page.tsx` — **Family mode** (shared: Tasks, Shopping, Meals, Reminders, Details)
  - `app/simulate/shopping/page.tsx` — a standalone simulation/demo harness for the shopping list
- **State:** Local React state (`useState`, `useTransition`, `useRef`). The current user is shared via `UserContext` (`lib/user-context.ts`) so mode switching does not re-fetch the user and cause a flash (see ADR-007).
- **Styling:** Tailwind CSS v4 via `@import "tailwindcss"` in `app/globals.css`. A custom `@theme inline` block remaps the `red-*` color scale to a warm violet palette (`#7C5CFC` family), so any component using `red-*` utilities renders violet without per-component edits. Precise custom colors use inline `style` props.

## Backend (Server Actions)

Each domain has a file in `lib/actions/`:

| File | Responsibility |
|---|---|
| `auth.ts` | `login`, `register`, `logout`, `getCurrentUser` — iron-session cookie auth |
| `todos.ts` | CRUD for date-scoped todos; self/family scoping; share/unshare to family |
| `goals.ts` | CRUD for weekly/yearly goals; share/unshare to family |
| `events.ts` | CRUD for calendar events; share/unshare; toggle completion |
| `family.ts` | Create/join/leave family, members, photo, emergency contacts, update user |
| `meals.ts` | Weekly meal grid get/set |
| `shopping.ts` | Shared shopping list CRUD + clear + **Brevo email export** |
| `google.ts` | OAuth URL, connection status, disconnect, calendar sync |

All write actions mutate the database directly via Drizzle. There is no separate API surface or DTO layer — actions accept and return the TypeScript interfaces from `lib/types.ts`.

## Database

- **Engine:** Turso (libSQL), a SQLite-compatible edge database.
- **Client:** `@libsql/client` `createClient({ url, authToken })` in `lib/db.ts`, wrapped by `drizzle()`.
- **Schema:** `lib/schema.ts` (Drizzle `sqliteTable` definitions). Migrations managed by `drizzle-kit` (`npm run db:generate` / `db:migrate`).
- See `DATABASE_SCHEMA.md` for the full table reference.

## Authentication

- **iron-session** stores an encrypted cookie `fp_session` containing only `{ userId }`.
- Cookie is `httpOnly`, `sameSite: 'lax'`, and `secure` in production.
- Encrypted with `SESSION_SECRET`.
- `getCurrentUser()` reads the session and loads the user row.
- The dashboard layout (`app/dashboard/layout.tsx`) gates access client-side: if `getCurrentUser()` returns null it redirects to `/login`.
- ⚠️ **Passwords are currently stored and compared in plaintext** (`auth.ts`). See ADR-008 / `FEATURE_STATUS.md` — this is a known security gap.

## Integrations & Services

### Google Calendar (`lib/google.ts` + `lib/actions/google.ts` + `app/api/google/callback/route.ts`)
- OAuth 2.0 authorization-code flow, scope `calendar.readonly`, `access_type=offline`.
- Flow:
  1. `getGoogleAuthUrl()` builds the consent URL.
  2. User consents; Google redirects to `/api/google/callback` (a Route Handler, marked `export const dynamic = 'force-dynamic'` so it is never statically evaluated at build time — see ADR-009).
  3. Callback exchanges the code for tokens, fetches the primary calendar id, and stores the connection.
  4. Access/refresh tokens are **encrypted with AES-256-GCM** (`lib/crypto.ts`, key `TOKEN_ENC_KEY`) before being written to `google_connections`.
  5. `syncGoogleCalendar()` refreshes the token if near expiry, fetches the current week's events, and upserts them into `calendar_events` with `source = 'google'`.

### Email (`lib/actions/shopping.ts` → Brevo)
- `sendShoppingListEmail()` POSTs to `https://api.brevo.com/v3/smtp/email` with `BREVO_API_KEY`.
- Sender: `Family Planner <familyplanner.notify@gmail.com>`.
- Sends the pending shopping list as formatted plaintext to one or more recipient emails.

## Major Data Flows

### Sharing a personal item to the family
1. In Self mode the user toggles "share" on a todo/goal/event.
2. The corresponding `shareXToFamily(id, familyId)` action sets `familyId`, `scope`-related fields, and `sharedToFamilyAt` (timestamp), linking back via `sharedFromId`.
3. Family mode reads items where `scope = 'family'` and matching `familyId`, so the shared item now appears for all members. Unsharing clears those fields.

### Google sync
Connect → tokens stored encrypted → `syncGoogleCalendar()` (manual button or auto-on-login via `sessionStorage` guard) → events upserted as `source='google'` → surfaced in Self "Today"/"This Week" and merged into reminder lists.

### Family membership
`createFamily()` generates a 6-char invite code and seeds `memberIds` with the creator. `joinFamily(code)` appends the user. `memberIds` is stored as a JSON-encoded string column and parsed on read (`toFamily()`).

## Notable Legacy / Dead Code
- `lib/store.ts` is a complete **localStorage-based** implementation of the entire data layer (users, families, todos, goals, shopping, meals, events). It predates the Turso migration and is **no longer imported anywhere** (verified by grep). It is retained for reference but should be considered dead. See ADR-001.
