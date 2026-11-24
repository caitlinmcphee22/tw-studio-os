# Together Wellness Studio OS (Phase 1)

Internal team platform for Together Wellness. Staff only. No client data in Phase 1.

## What it does
- Sign in with a shared studio passcode plus a Together Wellness email (`ALLOWED_DOMAIN`). Owners sign in with a personal owner password. First visit runs a setup screen that sets both. Hashed with scrypt, stored in `settings` and `people.pin_hash`. Sessions are HMAC-signed cookies (12 hours), key generated and stored in `settings`.
- Home: onboarding progress, next supervision, tasks, policies to acknowledge, noticeboard.
- Onboarding checklist per staff member (staff, their supervisor and owners can tick items).
- Library: policies and protocols with versioned read-and-acknowledge tracking.
- Supervision: sign-off list, shared agenda, session log and bookings.
- Leave and PD requests with owner approval.
- Inbox: tasks by queue, noticeboard posts (owners).
- Team (owners only): titles, supervisors, access on/off, activity log.

## Stack
- Next.js 16 (App Router, server actions), Neon Postgres via `@neondatabase/serverless`.
- Hosted on Vercel, functions in `syd1` (Sydney). Use a Neon database in Sydney (aws-ap-southeast-2).
- Tables are created and seeded automatically on first request (`lib/db.ts`).
- All queries are parameterised tagged templates. Every change writes to `audit_log`.

## Environment variables
| Key | What |
| --- | --- |
| `DATABASE_URL` | Set automatically when Neon is connected in Vercel Storage |
| `ALLOWED_DOMAIN` | e.g. `togetherwellness.com.au` |

Known limit of passcode sign-in: staff identity is self-declared (anyone with the passcode can type any staff email). Replace with Google sign-in or per-person passwords before Phase 2.

## Roles
- `admin` (owners and managers): everything, including Team, approvals and library editing.
- `staff`: their own records, plus anyone whose supervisor they are.

## Before Phase 2 (client data)
Independent security review: auth and session handling, role checks in every server action, hosting and backups, audit log retention, Privacy Act / APP obligations.

## Fonts
Proto Grotesk and ABC Whyte web fonts are in `public/fonts` (web licences in the TW Drive, Brand Fonts folder; Proto Grotesk's covers the invoiced domain and its subdomains, so host on a togetherwellness.com.au subdomain). Century Book Condensed has a desktop licence only, so headings fall back to a system serif until a web licence is bought.
