@AGENTS.md

# Family Planner — Claude Working Guide

This file is the entry point for any AI-assisted work in this repository. Read it fully before making changes. The `@AGENTS.md` import above is **non-negotiable**: this is a modified Next.js (16.2.7) — consult `node_modules/next/dist/docs/` before writing framework code, because APIs may differ from training data.

---

## 1. Understanding the project

Family Planner is a Next.js 16 (App Router) + React 19 web app that helps families coordinate daily life. It has two modes:

- **Self mode** (`app/dashboard/self`) — a user's private tasks, goals, reminders, progress.
- **Family mode** (`app/dashboard/family`) — shared tasks, shopping list, meal plan, and events visible to all members of a family.

Key mental model:
- The "backend" is **React Server Actions** in `lib/actions/*` (`'use server'`), not a separate API. The only Route Handler is the Google OAuth callback.
- Persistence is **Turso (libSQL/SQLite) via Drizzle ORM**. Schema lives in `lib/schema.ts`.
- Auth is a **iron-session** encrypted cookie holding only `{ userId }`.
- The current user is shared across the dashboard via **`UserContext`** (`lib/user-context.ts`) — pages assume a non-null user.
- Items move from Self → Family by setting `shared_to_family_at` / `family_id` (not by copying rows).

**Always prefer the `docs/` files over re-deriving facts from code.** They are the curated source of truth.

## 2. Docs to read first (in order)

When starting a session, read these in order:

1. Read `docs/PROJECT_OVERVIEW.md`
2. Read `docs/ARCHITECTURE.md`
3. Read `docs/FEATURE_STATUS.md`
4. Read `docs/SESSION_HANDOFF.md`
5. Read `docs/CODEBASE_MAP.md`

Only inspect source files if additional details are required.

Two more docs are consulted **on demand** (not part of the startup read):

- **`docs/DATABASE_SCHEMA.md`** — tables, columns, relationships; consult before any data change.
- **`docs/DECISIONS.md`** — ADR log; check before changing anything load-bearing, and add an entry when you make a significant decision.

If a task touches an area covered by an ADR, honor the decision or explicitly supersede it with a new ADR.

## 3. Documentation maintenance rules

Treat docs as part of the deliverable, not an afterthought.

- **Keep docs in sync with code in the same change.** If you alter the schema, update `DATABASE_SCHEMA.md`. New/changed feature → update `FEATURE_STATUS.md`. New integration or data flow → update `ARCHITECTURE.md` and `CODEBASE_MAP.md`.
- **Significant technical/product decisions → add an ADR** to `docs/DECISIONS.md` (decision, context, rationale, consequences). Never silently reverse an existing ADR; supersede it with a new numbered entry and mark the old one.
- **`SESSION_HANDOFF.md` is living state** — update it at the end of every working session (see checklist below).
- **Be honest in docs.** Record limitations, known gaps, and "needs attention" items rather than implying completeness. Distinguish what is done/verified from what is assumed.
- **No secrets in docs or git.** Reference env var *names*, never values.
- **Convert relative dates to absolute** when writing docs (e.g. "as of 2026-06").

## 4. Session-closing checklist

Before ending a session, verify:

- [ ] `npm run build` passes (TypeScript + build clean) if code changed.
- [ ] Docs updated for any code/schema/feature/decision change (rules above).
- [ ] `docs/SESSION_HANDOFF.md` updated: recent work, files changed, current blockers, next tasks, context to resume.
- [ ] New significant decisions captured as ADRs in `docs/DECISIONS.md`.
- [ ] Commit only when the user asks; if asked, write a clear message and **push** (deployment is automatic — see below).
- [ ] No secrets committed; `.env.local` stays untracked.
- [ ] Surface anything left incomplete or unverified explicitly to the user.

## 5. Coding standards

- **TypeScript, strict.** No `any` escape hatches; model data with the interfaces in `lib/types.ts`. Keep `lib/types.ts` and `lib/schema.ts` consistent.
- **Server vs client:** mutations and data access go through `'use server'` actions in `lib/actions/*`. UI is client components (`'use client'`). Don't reach into the DB from client code.
- **Match surrounding style.** Mirror existing naming, formatting, comment density, and the aligned-assignment style used in this codebase. Don't reformat unrelated code.
- **Styling:** Tailwind v4. Note the global remap in `app/globals.css` — `red-*` utilities render **warm violet** (`#7C5CFC`) by design (ADR-011); this is not a bug. Use it rather than fighting it. Use inline `style` only for precise one-off colors.
- **Dates/IDs:** use the helpers in `lib/utils.ts` (`getWeekNumber`, `todayISO`, `goalDayToISO`, `generateId`, etc.) rather than re-implementing.
- **Secrets/env:** read env vars at call time, not module load (see `lib/crypto.ts` `getKey()`), so the build doesn't crash when a var is absent at build evaluation (ADR-010).
- **Never change `TOKEN_ENC_KEY`** after first use — it makes stored Google tokens undecryptable (ADR-004).
- **Don't run manual deploys.** Pushing to `main` auto-deploys via Vercel's Git integration. The only manual deployment step is adding/changing env vars (dashboard or `vercel env`), which take effect on the next deploy.
- **Verify before destructive actions** and report outcomes faithfully (failing tests/builds stated plainly with output).

## 6. Architecture principles

- **Server Actions are the data boundary.** Keep business logic and all DB access there; the only Route Handler is the OAuth callback (which must be `force-dynamic` so it isn't evaluated at build time — ADR-009).
- **Shared-by-reference, not by-copy.** Self items become family-visible via `scope`/`family_id`/`shared_to_family_at`; unsharing clears those fields. Don't duplicate rows.
- **Family membership source of truth** is `families.member_ids` (JSON array); `users.family_id` is a kept-in-sync denormalization.
- **Secrets encrypted at rest.** Google tokens are AES-256-GCM encrypted (`lib/crypto.ts`).
- **Minimal dependencies.** External integrations (Google Calendar, Brevo email) are hand-rolled `fetch` clients, not SDKs — keep that lean unless there's a strong reason.
- **No DB-level foreign keys today** — relationships are enforced in application code. Be deliberate about orphan cleanup (e.g. when a user leaves a family).
- **Authorization is per-action and currently thin** — when adding/altering actions, verify the session owns the data being mutated. (Hardening this and replacing plaintext passwords are tracked tech debt — ADR-008 / `FEATURE_STATUS.md`.)
- **Don't resurrect `lib/store.ts`** — it's the dead localStorage layer from before the Turso migration (ADR-001).

## 7. Starting a new feature

When asked to start a feature, follow this protocol — **plan first, do not modify code yet**:

1. **Read the documentation first** (the session-start order in section 2).
2. **Propose an implementation plan** for the named feature. Do not write or change any code until the plan is approved.

The plan must cover:

1. **Files to modify** — which files/components/actions, and what changes in each.
2. **Database changes** — schema/migrations (`lib/schema.ts`, Drizzle), or explicitly "none".
3. **API changes** — server actions (`lib/actions/*`) or route handlers added/changed.
4. **UI changes** — pages/components affected and the intended UX.
5. **Risks** — edge cases, data-integrity concerns, security/auth implications, and any ADRs affected.
6. **Testing strategy** — how it will be verified (build, manual smoke test, scenarios to check).

**Then wait for approval before implementing.**

### After the plan is approved

Once the user reviews the plan and says to proceed:

1. **Proceed with implementation.**
2. **Follow the approved plan** — if reality forces a deviation, stop and flag it rather than silently diverging.
3. **Update all affected documentation as changes are made** — keep `docs/` in sync in the same change (see section 3), add an ADR for any significant decision (`docs/DECISIONS.md`), and update `docs/SESSION_HANDOFF.md`.
4. Run the session-closing checklist (section 4) before considering the feature done.

## 8. Long sessions / checkpointing

If a session gets long, checkpoint progress **without halting the work**:

1. **Summarize current progress.**
2. **Update `docs/SESSION_HANDOFF.md`** with:
   - **Completed work**
   - **Remaining work**
   - **Modified files**
3. **Do not stop implementation** — checkpoint and keep going.

This keeps state recoverable if the session is interrupted or context is compacted.

## 9. Pre-merge review

Before merging a feature, review the **entire** implementation (not just the latest diff) and produce a **review report**.

Check:

- **Code quality** — readability, naming, error handling, matches surrounding style; no `any` leaks.
- **Architecture consistency** — server-action boundary respected, share-by-reference model, ADRs honored (section 6).
- **Dead code** — unused imports/exports/files, leftover scaffolding, commented-out blocks.
- **Documentation completeness** — `docs/` updated for all changes, ADRs added where due, `SESSION_HANDOFF.md` current (section 3).
- **Missing tests** — untested paths and the scenarios that should cover them.
- **Performance concerns** — N+1 queries in actions, unnecessary refetches/renders, large client payloads.

**Review report format:** a short summary verdict, then findings grouped by the categories above, each tagged by severity (blocker / should-fix / nice-to-have) with file references. Call out anything that should block the merge.

---

When in doubt, read the relevant `docs/` file and the surrounding code before acting, and keep the docs true as you go.
