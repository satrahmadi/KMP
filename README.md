# KMP Console — Auth, Company Onboarding & Team Management

Implementation of `PRD-Auth-Company-TeamManagement.md`: registration + email OTP, login with mandatory
OTP 2FA, multi-company membership with a Company Switcher, Team Management (bulk invitations, accept
flow for new/existing emails), full RBAC (System Roles Admin/Member + Custom Roles with a per-module
permission matrix), and a platform-level Superadmin console.

Stack: Next.js 16 (App Router) + TypeScript, Prisma + SQLite, Tailwind CSS v4, `sonner` for toasts.

## Setup

```bash
npm install
npx prisma migrate dev   # creates prisma/dev.db and applies the schema
npm run db:seed          # seeds the permission catalog, System Roles, and a Superadmin account
npm run dev
```

Open http://localhost:3000.

## No email provider is wired up

OTP codes and invitation links are logged to the server console and kept in an in-memory outbox,
viewable at `/dev/inbox` (dev-only route, 404s in production). Whenever an OTP is issued, the API also
returns it as `devCode` outside production, and the UI surfaces it as a toast labeled "Dev mode" so the
whole flow — registration, login, invite acceptance, password reset — is testable without a real inbox.
Swap `sendMail` in `src/lib/mailer.ts` for a real provider (Resend, SES, …) when one is available; every
call site already awaits it.

## Seeded Superadmin

```
superadmin@kmp.local / SuperAdmin123
```

Superadmin is provisioned only via the seed script (or by another Superadmin through the console), never
through public signup — per FR-9.

## Scope

Covers every **Must-have** requirement in the PRD (§7). Out of scope, per §5.2 / §12: SSO, billing, a
real email provider, row-level permissions, and a Knowledge Base module (the dashboard's Overview page is
an intentional placeholder — Team Management and Roles & Permissions are the actual deliverable of this
phase). Product decisions the PRD left open in §12 (auto-login after OTP, no cap on companies per user,
Admin invitable as a co-admin, Superadmin-created users placed without a company by default, etc.) were
resolved with the most permissive/least-surprising default — see inline comments at the relevant route
handlers if you need to revisit one.

## Structure

- `prisma/schema.prisma` — data model (§8 of the PRD)
- `src/lib/permissions.ts` — the permission catalog (§9.2); every module registers its own keys here
- `src/lib/rbac.ts`, `src/lib/session.ts` — authorization + session/suspend semantics (§11)
- `src/app/api/**` — route handlers (see §14 of the PRD for the original endpoint sketch)
- `src/app/(dashboard, onboarding, invite, superadmin, ...)` — pages
