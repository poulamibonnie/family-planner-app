# Feature Status & Roadmap

Legend: ✅ Complete · 🟡 In progress · 🔵 Planned · ⛔ Blocked · ⚠️ Needs attention

_Last updated: 2026-06 (security: password hashing + per-action authorization)_

## ✅ Completed

| Feature | Notes |
|---|---|
| Email/password auth (register, login, logout) | iron-session cookie. Passwords hashed with scrypt (ADR-013); legacy plaintext rows auto-upgraded on login. |
| Self mode dashboard | Today, This Week, Year Goals, Reminders, Progress tabs |
| Daily to-do list | Date-scoped; add/toggle/delete; split pending/completed |
| Weekly goal board | Day × week grid, per-day color accents |
| Yearly goals | |
| Progress stats | Day/week/month/year roll-ups with circular progress ring |
| Calendar events | Create, complete, delete; browser + email reminders |
| Google Calendar OAuth | Connect, disconnect, encrypted token storage |
| Google Calendar sync | Manual + auto-on-login; current-week events upserted |
| Family create / join by code | 6-char invite code |
| Family mode dashboard | Tasks, Shopping, Meals, Reminders, Details tabs |
| Shared shopping list | Add/toggle/delete, clear completed, clear all |
| Shopping list email export | Brevo REST API; sends pending items |
| Meal planner | Weekly grid, breakfast/lunch/dinner per day |
| Share self items → family | Todos, goals, events via `shared_to_family_at` |
| Emergency contacts | Stored as JSON on family |
| Premium redesign | Warm-violet design system across all UI (commit `fe1cf89`) |
| Vercel production build fixes | Lazy crypto key init, `force-dynamic` callback route |

## 🟡 In Progress

| Item | State |
|---|---|
| Vercel production deployment | Env vars added to project; deploy build was the active task. `NEXT_PUBLIC_APP_URL` must match the final production domain, and the Google OAuth redirect URI must be whitelisted in Google Cloud console for the production URL. |
| Per-action authorization | Shipped (ADR-014). All server actions now verify session ownership via `lib/auth-guard.ts`. Client-supplied user/family IDs are validated against the session. |

## 🔵 Planned / Backlog

| Item | Rationale |
|---|---|
| ~~Password hashing~~ | Done — scrypt via `node:crypto` (ADR-013) |
| Family-scoped reminders parity | Ensure reminder UX matches Self mode in Family mode |
| Recurring events / goals | Common planner expectation |
| Multi-week Google sync window | Currently only the current week is fetched |
| Push/web notifications beyond in-tab | Reminders presently rely on browser notifications while app is open |
| ~~Remove dead `lib/store.ts`~~ | Done — deleted alongside security hardening |
| Real-time family updates | Currently requires refresh/refetch to see other members' changes |

## ⚠️ Needs Attention (Tech Debt / Risks)

| Issue | Impact |
|---|---|
| No DB foreign keys | Orphaned rows possible (e.g. items after a user leaves a family) |
| Client-side-only auth gate | `app/dashboard/layout.tsx` redirects in `useEffect`. Server actions now verify session ownership (ADR-014), but the client-side gate should eventually be replaced with middleware. |
| `member_ids` JSON column | No referential integrity; manual JSON parse/stringify |
| Secrets committed in `.env.local` | Present in working tree; ensure it is gitignored and rotate if ever pushed |

## ⛔ Blocked / Out of Scope

| Item | Reason |
|---|---|
| True "save to Google Keep" | No public consumer Keep API / email-to-Keep gateway. Shipped as email export instead (see `DECISIONS.md` ADR-006 and the plan in `.claude/plans`). |
