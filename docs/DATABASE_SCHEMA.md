# Database Schema

**Engine:** Turso (libSQL / SQLite)
**ORM:** Drizzle — canonical definitions in `lib/schema.ts`
**Migrations:** `drizzle-kit` (`npm run db:generate`, `npm run db:migrate`)

## Conventions

- All primary keys are `text` (application-generated via `generateId()` in `lib/utils.ts` — `base36(random) + base36(timestamp)`).
- Timestamps (`created_at`, `expires_at`, `shared_to_family_at`) are stored as **ISO-8601 text**, not native datetime.
- Booleans use Drizzle `integer({ mode: 'boolean' })` (0/1 in SQLite).
- Dates (`date` columns on todos/events) are `YYYY-MM-DD` text.
- There are **no foreign-key constraints declared** in the schema; relationships are by convention and enforced in application code. `family_id`, `user_id` etc. are plain text columns.

---

## `users`
The account table. One row per person.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | PK | |
| `name` | text | no | Display name |
| `email` | text | no | **Unique** |
| `password` | text | no | scrypt hash (`scrypt$<saltHex>$<hashHex>`) — see ADR-013 |
| `family_id` | text | yes | Current family membership (denormalized; also tracked in `families.member_ids`) |
| `created_at` | text | no | ISO timestamp |

## `families`
A household group.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | PK | |
| `name` | text | no | |
| `code` | text | no | **Unique** 6-char invite code |
| `member_ids` | text | no | **JSON-encoded array** of user ids |
| `created_by` | text | no | Creator user id |
| `created_at` | text | no | |
| `photo_url` | text | yes | Family photo (feature removed from UI but column retained) |
| `emergency_contacts` | text | yes | JSON-encoded `EmergencyContact[]` (`{id,name,relationship,phone}`) |

## `todos`
Date-scoped to-do items. Exist in both Self and Family scope.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | PK | |
| `text` | text | no | |
| `completed` | boolean | no | default `false` |
| `date` | text | no | `YYYY-MM-DD` |
| `user_id` | text | no | Owner |
| `scope` | text enum | no | `'self'` \| `'family'` |
| `family_id` | text | yes | Set when shared/created in family scope |
| `shared_from_id` | text | yes | Original self-item id when shared into family |
| `shared_to_family_at` | text | yes | ISO timestamp; non-null ⇒ currently shared |
| `created_at` | text | no | |

## `goals`
Weekly (day-pinned) or yearly goals.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | PK | |
| `text` | text | no | |
| `completed` | boolean | no | default `false` |
| `type` | text enum | no | `'weekly'` \| `'yearly'` |
| `week_number` | integer | yes | ISO week (weekly goals only) |
| `year` | integer | no | |
| `day` | text | yes | `Mon`..`Sun` (weekly goals only) |
| `user_id` | text | no | Owner |
| `scope` | text enum | no | `'self'` \| `'family'` |
| `family_id` | text | yes | |
| `shared_from_id` | text | yes | |
| `shared_to_family_at` | text | yes | |
| `created_at` | text | no | |

## `shopping_items`
Shared family shopping list (Family mode only).

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | PK | |
| `text` | text | no | Item name |
| `quantity` | text | no | Free-text quantity |
| `completed` | boolean | no | default `false` (picked up) |
| `added_by` | text | no | User id |
| `added_by_name` | text | no | Denormalized name for display |
| `family_id` | text | no | Owning family |
| `created_at` | text | no | |

## `meal_entries`
One cell of the weekly meal grid (day × meal type).

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | PK | |
| `day` | text | no | `Mon`..`Sun` |
| `meal_type` | text | no | `breakfast` \| `lunch` \| `dinner` |
| `meal` | text | no | Meal description |
| `week_number` | integer | no | |
| `year` | integer | no | |
| `family_id` | text | no | |

Uniqueness of (`family_id`, `day`, `meal_type`, `week_number`, `year`) is enforced in application code (upsert in `meals.ts`), not by a DB constraint.

## `calendar_events`
Events — both locally created and Google-synced.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | PK | |
| `title` | text | no | |
| `date` | text | no | `YYYY-MM-DD` |
| `time` | text | no | `HH:MM` or `''` for all-day |
| `description` | text | no | |
| `scope` | text enum | no | `'self'` \| `'family'` |
| `user_id` | text | no | Owner |
| `family_id` | text | yes | |
| `completed` | boolean | no | default `false` |
| `notify_minutes_before` | integer | no | Reminder lead time |
| `notified` | boolean | no | default `false` |
| `reminder_email` | text | yes | Optional email reminder target |
| `source` | text enum | no | `'local'` \| `'google'`, default `'local'` |
| `google_event_id` | text | yes | Set for synced events; used for upsert dedupe |
| `shared_from_id` | text | yes | |
| `shared_to_family_at` | text | yes | |
| `created_at` | text | no | |

## `password_reset_tokens`
Time-limited tokens for the email-based password reset flow.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | PK | `generateId()` |
| `user_id` | text | no | Owning user |
| `token_hash` | text | no | SHA-256 of the raw token (hex); raw token is sent only in the email link |
| `expires_at` | text | no | ISO timestamp; 1 hour from creation |
| `used` | boolean | no | Default `false`; set to `true` on consumption (single-use) |
| `created_at` | text | no | ISO timestamp |

## `google_connections`
Per-user Google OAuth connection. One row per user.

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | PK | |
| `user_id` | text | no | **Unique** |
| `access_token` | text | no | **AES-256-GCM encrypted** (`lib/crypto.ts`) |
| `refresh_token` | text | yes | Encrypted |
| `expires_at` | text | no | ISO timestamp; drives refresh |
| `calendar_id` | text | no | Primary calendar id (or `'primary'`) |
| `created_at` | text | no | |

---

## Relationship Map (by convention)

```
users 1───* todos          (todos.user_id)
users 1───* goals          (goals.user_id)
users 1───* calendar_events(calendar_events.user_id)
users 1───1 google_connections (google_connections.user_id, unique)
users 1───* password_reset_tokens (password_reset_tokens.user_id)
users *───1 families       (users.family_id  ↔  families.member_ids[] JSON)

families 1───* shopping_items  (family_id)
families 1───* meal_entries    (family_id)
families 1───* todos/goals/events when scope='family' (family_id)
```

## Ownership Notes
- **User-owned** (private in Self mode): a `todos`/`goals`/`calendar_events` row with `scope='self'`.
- **Family-shared**: same tables with `scope='family'` and a `family_id`; visible to all `member_ids`.
- **Family-only**: `shopping_items` and `meal_entries` are always family-scoped.
- The `member_ids` JSON array on `families` is the source of truth for membership; `users.family_id` is a convenience denormalization kept in sync by `updateUser()`.
