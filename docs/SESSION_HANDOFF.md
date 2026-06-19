# Session Handoff

_Purpose: enough context to resume development cold. Update at the end of each working session._

## As of: 2026-06 (security hardening: password hashing + per-action authorization)

## Recent work completed

1. **Security hardening** (ADR-013 + ADR-014):
   - `lib/password.ts` — scrypt password hashing (`node:crypto`, N=16384, r=8, p=1). Format: `scrypt$<saltHex>$<hashHex>`. No new dependency.
   - `lib/auth-guard.ts` — `requireUserId`, `assertFamilyMember`, `assertOwnership` helpers. All server actions now validate session identity server-side; client-supplied IDs are overridden or verified.
   - `lib/actions/auth.ts` — `register` hashes; `login` verifies + auto-upgrades legacy plaintext rows on success; `getCurrentUser` column-selects to exclude `password`.
   - `lib/types.ts` — `password` removed from `User` interface (never sent to client).
   - All action files (`todos`, `goals`, `events`, `shopping`, `meals`, `family`) hardened with session-based ownership checks. Signatures unchanged; client call sites untouched.
   - `lib/store.ts` deleted — was dead legacy code (ADR-001) that started failing the TypeScript build after the `User` type cleanup.
   - Build verified clean: TypeScript strict + all routes compiled.

2. **Premium redesign** (commit `fe1cf89`) — full visual overhaul to a warm-violet design system:
   - New global color system in `app/globals.css` (background `#FAFAF8`, `red-*` remapped to violet `#7C5CFC` — see ADR-011).
   - Rewrote `Navbar`, `login`, `register`, `WeeklyBoard`, `TodoList`, `GoalList`, `MealPlan`, `ProgressStats`, and both dashboard pages (`self`, `family`).
   - Self "Today" tab: circular progress ring, 2×2 stats grid, task composer, split upcoming/completed, `TodayTaskCard`, FAB.
   - Family page: member avatar cluster header, invite panel, day cards with colored left borders.
2. **Build fixes**:
   - `login`/`register` switched to real `<form onSubmit>` + `type="submit"` (ADR-012).
   - `app/dashboard/self/page.tsx`: `user.familyId` → `user?.familyId` in `handleShareToggle` (TS null-narrowing in closure).
   - `app/api/google/callback/route.ts`: added `export const dynamic = 'force-dynamic'` to stop a build-time `URL_INVALID` crash (ADR-009, commit `1c077ff`).
3. **Project documentation** created under `docs/` (commit `cd40cdf`): PROJECT_OVERVIEW, ARCHITECTURE, DATABASE_SCHEMA, FEATURE_STATUS, DECISIONS, SESSION_HANDOFF, CODEBASE_MAP.
4. **Vercel verified**: production domain is `https://family-planner-app-buwf.vercel.app`; latest git-triggered deploy is **Ready**. `NEXT_PUBLIC_APP_URL` corrected to that domain via the dashboard.
5. **`CLAUDE.md` working guide** added and expanded (commits `7fd9d49`, `82d2737`, `41f00fc`, `289904d`): project understanding, session-start reading order (§2), doc-maintenance rules, session-closing checklist, coding standards, architecture principles, feature lifecycle (§7 plan→approve→implement), long-session checkpointing (§8), pre-merge review (§9), commit message convention (§10).
6. **`.gitignore`**: `app/simulate` (local demo harness) is now ignored (commit `7b8137b`).
7. **`npm run build` passes clean** (all routes compiled, TypeScript OK) — last verified at this session close.

## Files changed recently (security hardening session)
- `lib/password.ts` (new — scrypt hashing)
- `lib/auth-guard.ts` (new — session guards)
- `lib/actions/auth.ts` (hash on register, verify+upgrade on login, strip password from getCurrentUser)
- `lib/types.ts` (remove `password` from `User`)
- `lib/actions/todos.ts`, `goals.ts`, `events.ts`, `shopping.ts`, `meals.ts`, `family.ts` (per-action authz)
- `lib/store.ts` (deleted — dead localStorage legacy)
- `docs/DECISIONS.md`, `FEATURE_STATUS.md`, `CODEBASE_MAP.md`, `DATABASE_SCHEMA.md`, `SESSION_HANDOFF.md`

Prior redesign session touched: `app/globals.css`, `app/login/page.tsx`, `app/register/page.tsx`, `app/dashboard/self/page.tsx`, `app/dashboard/family/page.tsx`, `app/api/google/callback/route.ts`, `components/{Navbar,WeeklyBoard,TodoList,GoalList,MealPlan,ProgressStats,ShoppingList}.tsx`, `lib/actions/shopping.ts`.

## Current state / blockers

- **Production domain:** `https://family-planner-app-buwf.vercel.app` (the clean `family-planner-app-buwf.vercel.app` alias → current `git-main` production deployment).
- **Deployment is automatic via Vercel's Git integration.** Every push to `main` triggers a production deploy — do **not** run `vercel deploy --prod` manually. Latest production deploy is **Ready** and current.
  - Earlier a build failed during "Collecting page data": the Google callback route was statically evaluated with no Turso URL → `LibsqlError: URL_INVALID`. Fixed via `force-dynamic` (committed) and by adding env vars; subsequent git-triggered deploys are green.
  - **All 10 environment variables are set in the Vercel project (production scope)**: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY`, `BREVO_SMTP_LOGIN`, `BREVO_SMTP_PASSWORD`, `BREVO_API_KEY`, `NEXT_PUBLIC_APP_URL`. New/changed env vars only take effect on the **next** deploy (a push, or the dashboard "Redeploy" button) — they do not apply retroactively. `NEXT_PUBLIC_APP_URL` in particular is inlined at build time.
  - ✅ `NEXT_PUBLIC_APP_URL` corrected (via Vercel dashboard) to `https://family-planner-app-buwf.vercel.app`. (It had briefly been set to a guessed `flax` domain that didn't exist.) This drives the OAuth `redirect_uri`.

## Next tasks (in order)

1. **Whitelist the production OAuth redirect URI** (`https://family-planner-app-buwf.vercel.app/api/google/callback`) in the Google Cloud console, or Google login will fail in prod.
2. **Smoke test in prod:** register/login, create a family, add todos/shopping items, send a shopping email, connect+sync Google Calendar. Verify existing users are migrated (password field becomes `scrypt$…` on next login).
3. **Remaining tech debt:** no DB foreign keys; client-side-only auth gate (dashboard layout redirects in `useEffect` — could be replaced with Next.js middleware for server-side enforcement).

## Context needed to resume
- Read `ARCHITECTURE.md` and `CODEBASE_MAP.md` first.
- Auth is iron-session cookie (`fp_session`); current user is shared via `UserContext` (ADR-007).
- `red-*` Tailwind classes render **violet** by design (ADR-011) — not a bug.
- `lib/store.ts` is dead legacy code — ignore it (ADR-001).
- Google tokens are AES-GCM encrypted; **never change `TOKEN_ENC_KEY`** (ADR-004/010).
- Secrets live in `.env.local` locally and in Vercel project env for prod.
