# Project Overview

## Summary

Family Planner is a full-stack web application that helps families coordinate their daily lives. Users operate in two modes — a private **Self** mode for personal tasks and goals, and a shared **Family** mode where tasks, meals, a shopping list, and calendar events are visible to all family members.

## Target Users

Families of 2–6 members who want a single shared tool to replace ad-hoc messaging-app lists, paper meal plans, and disconnected reminder apps. The primary user is typically the household organiser (a parent) who also invites partners and children via an invite code.

## Business Goals

- Provide a premium, consumer-grade planner that feels closer to Notion or Todoist than a generic CRUD app.
- Retain users through the shared family data model (network effect: value grows with each member added).
- Support Google Calendar as a data source so the app slots into existing workflows rather than competing with them.

## Core Features

| Feature | Mode | Status |
|---|---|---|
| Daily to-do list (date-scoped) | Self | ✅ Live |
| Weekly goal board (day × week grid) | Self / Family | ✅ Live |
| Yearly goals | Self | ✅ Live |
| Progress stats (circular ring + per-day insights) | Self | ✅ Live |
| Calendar events + browser/email reminders | Self / Family | ✅ Live |
| Google Calendar OAuth + sync | Self | ✅ Live |
| Family creation / join by code | Family | ✅ Live |
| Shared shopping list | Family | ✅ Live |
| Email shopping list (Brevo REST API) | Family | ✅ Live |
| Meal planner (weekly grid) | Family | ✅ Live |
| Share individual tasks/events to family | Self → Family | ✅ Live |
| Emergency contacts | Family | ✅ Live |

## Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.7 (App Router, Turbopack) |
| UI runtime | React 19 |
| Styling | Tailwind CSS v4 (`@import "tailwindcss"`, `@theme inline`) |
| Database | Turso (libSQL / SQLite edge) |
| ORM | Drizzle ORM |
| Auth | iron-session (cookie-based, encrypted) |
| Token encryption | AES-256-GCM (`lib/crypto.ts`) |
| Google OAuth | Custom `fetch` client — `lib/google.ts` + `/api/google/callback` |
| Email | Brevo REST API (`api.brevo.com/v3/smtp/email`) |
| Deployment | Vercel (production) |
| Language | TypeScript (strict) |

## Where to Go Next

- **Architecture & data flows:** `ARCHITECTURE.md`
- **Database reference:** `DATABASE_SCHEMA.md`
- **Roadmap & known gaps:** `FEATURE_STATUS.md`
- **Why things are the way they are:** `DECISIONS.md`
- **Directory guide:** `CODEBASE_MAP.md`
- **Resume work / current state:** `SESSION_HANDOFF.md`
