# Architectural Decision Record (ADR) Log

Each entry: decision, context, rationale, and consequences. Newest concerns first; numbering is chronological-ish by when the decision became load-bearing.

---

## ADR-001 — Migrate persistence from localStorage to Turso/Drizzle
**Status:** Accepted
**Context:** The app began as a client-only prototype storing everything in `localStorage` (`lib/store.ts`). This could not support a *shared* family data model — each browser had its own siloed data.
**Decision:** Move all persistence to Turso (libSQL) accessed via Drizzle ORM through server actions. Keep `lib/store.ts` in the tree temporarily for reference.
**Consequences:** Real multi-user/multi-device sharing works. `lib/store.ts` is now dead code (no imports) and should eventually be deleted. Server actions became the data boundary.

## ADR-002 — Use Server Actions instead of a REST/route-handler API
**Status:** Accepted
**Context:** Next.js App Router supports `'use server'` functions callable directly from client components.
**Decision:** Implement all reads/writes as server actions in `lib/actions/*`, passing domain types from `lib/types.ts` directly. The only Route Handler is the Google OAuth callback (which must be a real URL for the redirect).
**Rationale:** Less boilerplate, end-to-end type safety, no DTO/serialization layer.
**Consequences:** No public API surface. Per-action authorization must be added deliberately (currently a gap — see ADR-008/FEATURE_STATUS).

## ADR-003 — iron-session cookie auth
**Status:** Accepted
**Decision:** Use `iron-session` to store an encrypted `fp_session` cookie holding only `{ userId }`, with `SESSION_SECRET` as the key.
**Rationale:** Simple, stateless, no session table; works with server actions and the route handler via `cookies()`.
**Consequences:** Session is just a user id; all authorization derives from re-loading the user. Cookie is `httpOnly`/`lax`/`secure`-in-prod.

## ADR-004 — Encrypt Google tokens at rest (AES-256-GCM)
**Status:** Accepted
**Context:** Google OAuth access/refresh tokens are sensitive and stored in `google_connections`.
**Decision:** Encrypt tokens with AES-256-GCM (`lib/crypto.ts`) using `TOKEN_ENC_KEY` (hex) before insert; decrypt on use. Format `iv:tag:ciphertext` (hex).
**Consequences:** DB compromise alone does not leak usable tokens. **`TOKEN_ENC_KEY` must never change after first use** or existing tokens become undecryptable.

## ADR-005 — Hand-rolled Google Calendar client (no SDK)
**Status:** Accepted
**Decision:** Implement OAuth + Calendar v3 calls with `fetch` in `lib/google.ts` rather than `googleapis`.
**Rationale:** Avoid a heavy dependency for a small surface (auth URL, token exchange/refresh, list events, get primary calendar). Scope limited to `calendar.readonly`.
**Consequences:** We own token-refresh logic (`syncGoogleCalendar` refreshes when within 60s of expiry). Sync window is currently the current week only.

## ADR-006 — Shopping list "export" is email, not Google Keep
**Status:** Accepted
**Context:** User wanted to push the shopping list to Google Keep. Google Keep has no public consumer API and no email-to-Keep gateway.
**Decision:** Ship an **email export** via the Brevo REST API instead, sending pending items as formatted text. UI is labelled honestly ("Mail the shopping list").
**Rationale:** Delivers the practical goal (take the list with you / share it) without a fragile Apps Script bridge.
**Consequences:** Adds `BREVO_API_KEY` dependency. No literal Keep integration. (Full reasoning in `.claude/plans/elegant-painting-dijkstra.md`.)

## ADR-007 — Share current user via React Context
**Status:** Accepted
**Context:** Switching between Self and Family mode re-fetched the user and caused a visible flash/glitch.
**Decision:** Load the user once in `app/dashboard/layout.tsx` and provide it via `UserContext` (`lib/user-context.ts`); pages consume `useUser()`.
**Consequences:** Smooth mode switching; pages assume a non-null user inside the dashboard. (Commit `263da4d`.)

## ADR-008 — (Known debt) Plaintext password storage
**Status:** Accepted-with-debt ⚠️
**Context:** Auth was built quickly for the prototype.
**Decision (current):** Store and compare passwords as plaintext in `users.password`.
**Rationale:** Expedience during prototyping.
**Consequences:** **Critical security gap.** Must be replaced with a salted hash (bcrypt/argon2) before any real-user launch. Tracked in `FEATURE_STATUS.md`.

## ADR-009 — Force the Google callback route to be dynamic
**Status:** Accepted
**Context:** Vercel production build failed during "Collecting page data" because the `/api/google/callback` route was statically evaluated and instantiated the DB client with an `undefined` Turso URL (`URL_INVALID`).
**Decision:** Add `export const dynamic = 'force-dynamic'` to `app/api/google/callback/route.ts`.
**Consequences:** Route is only executed at request time, never at build time. (Commit `1c077ff`.)

## ADR-010 — Lazy DB/crypto key initialization
**Status:** Accepted
**Context:** Earlier Vercel builds failed because module-level code read env vars (e.g. encryption key) that aren't present during build.
**Decision:** Read `TOKEN_ENC_KEY` lazily inside `getKey()` at call time rather than at module load (`lib/crypto.ts`).
**Consequences:** Build no longer crashes when the var is absent at build evaluation; the var is still required at runtime. (Commit `d8abc7e`.)

## ADR-011 — Color system via Tailwind `red-*` remap
**Status:** Accepted
**Context:** The premium redesign moved the brand from forest green to warm violet (`#7C5CFC`). Many components used `red-*` utilities.
**Decision:** Remap the entire `red-*` scale to violet shades in `app/globals.css` via `@theme inline`, instead of editing every component.
**Rationale:** One-line-per-shade change recolors unedited components (Reminders, FamilyManager, CalendarEvents) for free.
**Consequences:** `red-*` class names now render violet — potentially surprising to new contributors; documented here and in `CODEBASE_MAP.md`.

## ADR-012 — Login/Register use a real `<form onSubmit>`
**Status:** Accepted
**Context:** A redesign intermediate used a `<button onClick>` outside a form, which broke native Enter-to-submit and semantics.
**Decision:** Wrap fields in `<form onSubmit={handleSubmit}>` with a `type="submit"` button.
**Consequences:** Correct keyboard behavior and accessibility.
