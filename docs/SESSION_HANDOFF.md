# Session Handoff

_Purpose: enough context to resume development cold. Update at the end of each working session._

## As of: 2026-06-22 (Name editing + password reset)

## Recent work completed

0. **User and family name editing** (2026-06-22, commit `62bab9e`):
   - New `updateFamilyName(familyId, name)` server action in `lib/actions/family.ts` (guarded by `assertFamilyMember`).
   - `app/dashboard/layout.tsx` now passes `onNameChange` callback to Navbar; when the user saves a new display name, the callback patches the `user` state held in the `UserContext.Provider`, so all consumers (including the Self-mode greeting) update immediately without a page reload.
   - `components/Navbar.tsx` — accepts `onNameChange` prop; calls it after `updateUser` succeeds.
   - `app/dashboard/family/page.tsx` — hover the family name heading to reveal a pencil ✏️ icon; click to enter an inline edit mode (input + save/cancel). Saving calls `updateFamilyName` and patches local `family` state so the heading, info panel, and all `family.name` references update instantly.

1. **Password reset flow** (2026-06-22, commit `28c103a`):
   - New `password_reset_tokens` table in `lib/schema.ts` + migration `drizzle/0006_next_scorpion.sql`.
   - `requestPasswordReset(email)` and `resetPassword(token, newPassword)` added to `lib/actions/auth.ts`. Token is a 32-byte random value; only its SHA-256 hash is stored. Expiry 1 hour, single-use. Email sent via Brevo. No email enumeration (always silent on unknown address).
   - New pages: `app/forgot-password/page.tsx` (email entry) and `app/reset-password/page.tsx` (new password entry, reads `?token=` via `useSearchParams` in a `Suspense` boundary).
   - `app/login/page.tsx` updated with "Forgot password?" link.
   - ADR-015 added. Build verified clean.

1. **WeeklyBoard improvements** (Self mode, multiple commits 2026-06-19):
   - **+ icon submit on day cards** (commit `998ba41`): removed the separate "Add" text button; the input now shows a `+` icon on the right as the only submit control. Clicking or pressing Enter adds the task. Button dims to 30% opacity when input is empty. Clicking empty space in the task list area focuses that day's input (click-to-focus).
   - **Recurring Quick Add** (commit `d776b38`): Quick Add sidebar now has day-of-week toggles (Mo Tu We Th Fr Sa Su) below the task name field. Today's day is pre-selected. Toggling additional days makes the add recurring. At least one day stays selected. `Promise.all` creates one goal per selected day, mapped to the correct ISO date for the viewed week.
   - **Insights drawer** (commit `56c8f55`): "View insights >" button in the Week Overview sidebar card now opens a slide-in drawer. The drawer shows the overall donut ring, total done/total count, and a per-day breakdown with colored progress bars and completion percentages. Clicking the backdrop or X closes it.

1. **FamilyWeeklyBoard component extracted** (commit `5af873a`):
   - New file `components/FamilyWeeklyBoard.tsx` extracted from `app/dashboard/family/page.tsx`.
   - Family Tasks tab now uses `FamilyWeeklyBoard` instead of inline day-card rendering.
   - `FamilyWeeklyBoard` has the same feature set as the Self-mode `WeeklyBoard`: week navigator (`< 📅 Week of … >`), sidebar with Week Overview + Quick Add (recurring day toggles), and Insights drawer.
   - `app/dashboard/family/page.tsx` was substantially simplified — day-card rendering logic moved into the component.

2. **Progress tab removed from Self mode** (commit `c71f937`):
   - The standalone Progress tab (`ProgressStats` component) was removed from `app/dashboard/self/page.tsx`.
   - Progress stats (circular ring) remain embedded in the **Today** tab.
   - Self mode now has 4 tabs: Today, This Week, Year Goals, Reminders.

3. **This Week tab UI redesign** (commit `fd90554`, 2026-06-19):
   - Week navigator, sidebar panels (Week Overview + Quick Add), tip bar, Navbar username chevron + active-tab underline.
   - Build verified clean at that point.

4. **Security hardening** (ADR-013 + ADR-014, commit `24882a1`):
   - `lib/password.ts` — scrypt hashing. `lib/auth-guard.ts` — session guards on all actions.
   - `lib/store.ts` deleted (dead localStorage legacy).

5. **Premium redesign** (commit `fe1cf89`) — warm-violet design system.

## Files changed recently

**Name editing session (2026-06-22):**
- `lib/actions/family.ts` — added `updateFamilyName`
- `app/dashboard/layout.tsx` — added `onNameChange` callback to Navbar
- `components/Navbar.tsx` — added `onNameChange` prop, calls it after save
- `app/dashboard/family/page.tsx` — inline family name edit UI

**Password reset session (2026-06-22):**
- `lib/schema.ts` — added `passwordResetTokens` table
- `lib/actions/auth.ts` — added `requestPasswordReset`, `resetPassword`
- `app/forgot-password/page.tsx` — new page
- `app/reset-password/page.tsx` — new page
- `app/login/page.tsx` — added "Forgot password?" link
- `drizzle/0006_next_scorpion.sql` — generated migration

**WeeklyBoard / FamilyWeeklyBoard session (2026-06-19):**
- `components/WeeklyBoard.tsx` — + icon submit, recurring day toggles, Insights drawer
- `components/FamilyWeeklyBoard.tsx` — new file (extracted from family page)
- `app/dashboard/self/page.tsx` — removed Progress tab
- `app/dashboard/family/page.tsx` — simplified; delegates Tasks tab to `FamilyWeeklyBoard`

**This Week redesign session (2026-06-19):**
- `components/WeeklyBoard.tsx` — sidebar layout, week navigator, Week Overview + Quick Add cards
- `components/Navbar.tsx` — username chevron, active-tab purple underline
- `app/dashboard/self/page.tsx` — week navigation state, tip bar

**Security hardening session:**
- `lib/password.ts` (new), `lib/auth-guard.ts` (new)
- `lib/actions/auth.ts`, `lib/types.ts`
- `lib/actions/todos.ts`, `goals.ts`, `events.ts`, `shopping.ts`, `meals.ts`, `family.ts`
- `lib/store.ts` (deleted)

## Current state / blockers

- **Production domain:** `https://family-planner-app-buwf.vercel.app` (auto-deploys on push to `main`).
- **Deployment is automatic via Vercel's Git integration.** Do **not** run `vercel deploy --prod` manually.
- **All 10 environment variables set in Vercel project (production scope):** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `SESSION_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENC_KEY`, `BREVO_SMTP_LOGIN`, `BREVO_SMTP_PASSWORD`, `BREVO_API_KEY`, `NEXT_PUBLIC_APP_URL`.
- **Google OAuth redirect URI** (`https://family-planner-app-buwf.vercel.app/api/google/callback`) must be whitelisted in Google Cloud console for production login to work.

## Next tasks (in order)

1. **Smoke test name editing in prod:** change display name → verify Self-mode greeting updates; rename family → verify heading updates.
2. **Smoke test password reset in prod:** request reset for a real account, receive email, click link, set new password, login.
3. **Whitelist the production OAuth redirect URI** in Google Cloud console if not yet done.
2. **Smoke test in prod:** register/login, create a family, add todos/shopping items, send a shopping email, connect+sync Google Calendar.
3. **Family mode parity:** verify FamilyWeeklyBoard's Quick Add writes goals/todos to the correct family scope and appears for all family members.
4. **Remaining tech debt:** no DB foreign keys; client-side-only auth gate in `dashboard/layout.tsx` (could be replaced with Next.js middleware).

## Context needed to resume

- Read `ARCHITECTURE.md` and `CODEBASE_MAP.md` first.
- Auth is iron-session cookie (`fp_session`); current user is shared via `UserContext` (ADR-007).
- `red-*` Tailwind classes render **violet** by design (ADR-011) — not a bug.
- `lib/store.ts` is deleted — do not reference it (ADR-001).
- Google tokens are AES-GCM encrypted; **never change `TOKEN_ENC_KEY`** (ADR-004/010).
- Self mode tabs: Today, This Week, Year Goals, Reminders (no separate Progress tab).
- `FamilyWeeklyBoard` (`components/FamilyWeeklyBoard.tsx`) is the Family Tasks tab component; it mirrors the Self-mode `WeeklyBoard` feature set.
- Secrets live in `.env.local` locally and in Vercel project env for prod.
