# Codebase Map

A directory-by-directory guide to the repository. Paths are relative to the project root (`family-planner-app/`).

## Root

| File | Purpose |
|---|---|
| `package.json` | Scripts (`dev`, `build`, `start`, `lint`, `db:*`) and deps. Next 16.2.7, React 19, Drizzle, libSQL, iron-session. |
| `AGENTS.md` / `CLAUDE.md` | Agent instructions. **Warns this is a modified Next.js — read `node_modules/next/dist/docs/` before writing code.** |
| `.env.local` | Local secrets (Turso, session, Google OAuth, Brevo, token enc key). Not for commit. |
| `drizzle.config.*` / migrations | Drizzle Kit config and generated SQL migrations. |
| `next.config.*`, `tsconfig.json`, `eslint` config | Standard tooling. |

## `app/` — Next.js App Router

| Path | Purpose |
|---|---|
| `app/layout.tsx` | Root layout: fonts, `globals.css`, `<html>/<body>`. |
| `app/globals.css` | Tailwind v4 import + **`@theme inline` color system** (remaps `red-*` → warm violet `#7C5CFC`; background `#FAFAF8`). See ADR-011. |
| `app/page.tsx` | Public landing page. |
| `app/login/page.tsx` | Login form (`<form onSubmit>`, server action `login`). |
| `app/register/page.tsx` | Registration form (server action `register`). |
| `app/dashboard/layout.tsx` | **Auth gate**: loads current user, redirects to `/login` if absent, renders `Navbar`, provides `UserContext`. |
| `app/dashboard/page.tsx` | Dashboard entry/redirect. |
| `app/dashboard/self/page.tsx` | **Self mode** — the largest page. Tabs: Today (progress ring + stats + composer + task cards + FAB), This Week (`WeeklyBoard`), Year Goals (`GoalList`), Reminders (`Reminders`). Also hosts the "Share with Family" slide-in panel and Google connect/sync header buttons. Contains the local `TodayTaskCard` component. Progress stats are now embedded in the Today tab; the standalone Progress tab was removed. |
| `app/dashboard/family/page.tsx` | **Family mode** — member avatar cluster header, info/invite panel, tabs: Tasks (`FamilyWeeklyBoard`), Shopping (`ShoppingList`), Meals (`MealPlan`), Reminders, Details (`FamilyManager`). |
| `app/api/google/callback/route.ts` | Google OAuth **Route Handler**. Exchanges code, stores encrypted tokens, redirects back. Marked `force-dynamic` (ADR-009). |
| `app/simulate/shopping/page.tsx` | Standalone simulation/demo harness for the shopping list (not part of the auth'd app). |

## `components/` — Client UI components

| File | Purpose |
|---|---|
| `Navbar.tsx` | Top bar: logo, Self/Family mode toggle, avatar dropdown (edit name, disconnect Google, sign out). Username shows ▼ chevron; active mode tab has violet `border-b-2` underline. |
| `WeeklyBoard.tsx` | **Self mode** weekly goal grid. Per-day color accents (`DAY_ACCENT`), today highlight, + icon submit on day cards (click-to-focus), week navigator (`< 📅 Week of … >`), right sidebar with **Week Overview** (SVG donut ring, "View insights" slide-in drawer) and **Quick Add** (recurring day-of-week toggles — Mo/Tu/We/Th/Fr/Sa/Su, today pre-selected, creates one goal per selected day). |
| `FamilyWeeklyBoard.tsx` | **Family mode** equivalent of `WeeklyBoard`. Shares todo + event data for the family. Same week navigator, sidebar (Week Overview + Quick Add with recurring day toggles), and Insights drawer. Extracted from `app/dashboard/family/page.tsx`. |
| `TodoList.tsx` | Generic todo list with custom add form, circular checkbox, split pending/completed. |
| `GoalList.tsx` | Goal list with numbered accent badges; used for yearly goals. Accent palette includes `violet`/`amber`. |
| `MealPlan.tsx` | Weekly meal grid (day × breakfast/lunch/dinner); week nav; inline cell editing; saves via `meals` actions. |
| `ShoppingList.tsx` | Shared shopping list: add, toggle, delete, **Clear Completed** (fixed bottom-center pill) / Clear All, and the **email export** ("Mail the shopping list") section. |
| `ProgressStats.tsx` | Period selector (Today/Week/Month/Year) + circular progress + per-category bars + all-periods glance cards. Color thresholds via `pctColor()`. |
| `Reminders.tsx` | Event reminders UI; builds `mailto:` links; browser notifications. |
| `CalendarEvents.tsx` | Calendar event create/list/complete UI. |
| `GoogleCalendarSync.tsx` | Google connect/sync controls (where used). |
| `FamilyManager.tsx` | Family Details tab: members, invite code, emergency contacts. |

> Styling note: components freely use `red-*` Tailwind classes that render **violet** due to the global remap (ADR-011). Precise one-off colors use inline `style`.

## `lib/` — Logic, data, and integrations

### Data layer
| File | Purpose |
|---|---|
| `lib/db.ts` | Drizzle client over `@libsql/client` using `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN`. |
| `lib/schema.ts` | **Canonical Drizzle table definitions** (users, families, todos, goals, shopping_items, meal_entries, calendar_events, google_connections). See `DATABASE_SCHEMA.md`. |
| `lib/types.ts` | TypeScript interfaces mirroring the schema; the lingua franca passed between client and server actions. |
| ~~`lib/store.ts`~~ | Deleted — legacy localStorage layer (ADR-001). |

### Server actions (`lib/actions/`, all `'use server'`)
| File | Key exports |
|---|---|
| `auth.ts` | `login`, `register`, `logout`, `getCurrentUser` |
| `todos.ts` | self/family todo CRUD + share/unshare |
| `goals.ts` | weekly/yearly goal CRUD + share/unshare |
| `events.ts` | calendar event CRUD, toggle, share/unshare |
| `family.ts` | `createFamily`, `joinFamily`, `leaveFamily`, `getFamilyMembers`, photo/contacts, `updateUser` |
| `meals.ts` | `getFamilyMeals`, `setMeal` |
| `shopping.ts` | shopping CRUD, clear all/completed, **`sendShoppingListEmail`** (Brevo) |
| `google.ts` | `getGoogleAuthUrl`, `getGoogleConnection`, `disconnectGoogle`, `syncGoogleCalendar` |

### Cross-cutting helpers
| File | Purpose |
|---|---|
| `lib/session.ts` | iron-session `sessionOptions` and `SessionData` type. |
| `lib/crypto.ts` | AES-256-GCM `encrypt`/`decrypt` for Google tokens; lazy `getKey()` reads `TOKEN_ENC_KEY` (ADR-010). |
| `lib/password.ts` | `hashPassword` / `verifyPassword` using `node:crypto` scrypt. Stored format: `scrypt$<saltHex>$<hashHex>`. See ADR-013. |
| `lib/auth-guard.ts` | `requireUserId`, `assertFamilyMember`, `assertOwnership` — server-side session guards used by all actions. See ADR-014. |
| `lib/google.ts` | Google OAuth + Calendar v3 `fetch` client: `buildAuthUrl`, `exchangeCode`, `refreshAccessToken`, `fetchCalendarEvents`, `fetchPrimaryCalendarId`. |
| `lib/utils.ts` | Date/week helpers (`getWeekNumber`, `getYear`, `todayISO`, `getStartOfWeekISO`, `goalDayToISO`, `dateToDayOfWeek`), `generateId`, `DAYS`, `MEAL_TYPES`. |
| `lib/user-context.ts` | `UserContext` + `useUser()` for sharing the current user across the dashboard (ADR-007). |

## `docs/` — This documentation set
`PROJECT_OVERVIEW.md`, `ARCHITECTURE.md`, `DATABASE_SCHEMA.md`, `FEATURE_STATUS.md`, `DECISIONS.md`, `SESSION_HANDOFF.md`, `CODEBASE_MAP.md`.

## Entry points at a glance
- **App boot:** `app/layout.tsx` → route page.
- **Authenticated app:** `app/dashboard/layout.tsx` (gate + Navbar + context) → `self` or `family` page.
- **Data in/out:** client component → `lib/actions/*` server action → `lib/db.ts` (Drizzle) → Turso.
- **External callback:** Google → `app/api/google/callback/route.ts`.
