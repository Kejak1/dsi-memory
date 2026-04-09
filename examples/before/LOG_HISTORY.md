# Project Alpha — Log History

> SaaS Platform for B2B Invoice Management
> Stack: Next.js 14 / TypeScript / Supabase / Vercel

---

### DATE: 2024-01-08 | TYPE: Project Initialization
**Agent:** Claude
**Status:** Phase 1 foundation complete — auth, database, deployment

**Work Done:**
- Scaffolded Next.js 14 App Router project with TypeScript
- Integrated Supabase for authentication (email/password + magic link)
- Created initial database schema:
  - `users` table with `id`, `email`, `company_name`, `role` (admin/member)
  - `invoices` table with `id`, `user_id`, `client_name`, `amount`, `currency`, `status`, `due_date`
  - `line_items` table with `id`, `invoice_id`, `description`, `quantity`, `unit_price`
  - Row Level Security (RLS) policies for all tables
- Built authentication flow with login, signup, and password reset pages
- Created dashboard layout with sidebar navigation
- Deployed initial version to Vercel (iad1 region)
- Fixed Supabase environment variable loading issue on Vercel
- Added health check endpoint at `/api/health`

**Files Modified:**
- `src/lib/supabase.ts` — Supabase client initialization
- `src/lib/auth.ts` — Auth helper functions
- `src/app/login/page.tsx` — Login page with email/password
- `src/app/signup/page.tsx` — Registration page
- `src/app/dashboard/layout.tsx` — Dashboard shell with sidebar
- `src/app/dashboard/page.tsx` — Dashboard overview
- `supabase/migrations/001_initial_schema.sql` — Database schema
- `.env.local` — Environment variables

**Next Steps:**
- Build invoice creation form
- Add PDF generation for invoices
- Implement Stripe integration for payments

---

### DATE: 2024-01-14 | TYPE: Authentication Overhaul
**Agent:** Claude
**Status:** Completed — migrated from Auth0 to Supabase Auth

**Work Done:**
- The team realized Auth0 pricing was going to destroy unit economics for the B2B SaaS model. At $0.50/MAU after the free tier, costs would hit $5,000/mo at 10k users.
- Evaluated three alternatives over a 3-day sprint:
  - Clerk: Great DX but $0.02/MAU still adds up + React-only
  - Firebase Auth: Free tier generous but vendor lock-in to GCP
  - Supabase Auth: Already using Supabase for DB, zero additional cost, built-in RLS integration
- Decided on Supabase Auth to consolidate the stack
- Migrated 15,247 active users via a multi-stage background worker:
  - Stage 1: Export user records from Auth0 Management API (batch of 100)
  - Stage 2: Hash password migration using Auth0's `bcrypt` → Supabase's `bcrypt` (compatible, no rehash needed)
  - Stage 3: Re-create MFA enrollments for 892 users who had TOTP enabled
  - Stage 4: Update all JWT middleware to validate Supabase tokens instead of Auth0
  - Stage 5: DNS cutover for custom domain auth.projectalpha.com
- Migration completed in 14 hours with zero downtime using blue-green deployment
- Old Auth0 tenant kept active for 30 days as rollback safety net
- Monthly auth cost dropped from projected $5,000 to $0

**Files Modified:**
- `src/lib/auth.ts` — Complete rewrite from Auth0 SDK to Supabase Auth
- `src/middleware.ts` — JWT validation updated
- `src/app/login/page.tsx` — UI updated for Supabase auth flow
- `src/app/signup/page.tsx` — Registration flow updated
- `scripts/migrate_auth0_users.py` — One-time migration script
- `scripts/verify_migration.py` — Post-migration verification
- `.env.local` — Removed Auth0 vars, confirmed Supabase vars

**Key Technical Notes:**
- Auth0 bcrypt rounds: 10, Supabase bcrypt rounds: 10 — direct hash compatibility confirmed
- TOTP secrets are stored encrypted in Auth0; had to re-enroll MFA users via email campaign
- Custom domain SSL cert auto-provisioned by Supabase within 15 minutes

**Next Steps:**
- Remove Auth0 SDK dependency from package.json
- Update API documentation
- Monitor error rates for 7 days post-migration

---

### DATE: 2024-02-05 | TYPE: Database Schema Expansion
**Agent:** Claude
**Status:** Enterprise features database layer complete

**Work Done:**
- Expanded `users` table with enterprise columns:
  - `subscription_tier` (free/pro/enterprise) with default 'free'
  - `company_size` (1-10/11-50/51-200/200+)
  - `onboarding_completed` boolean
  - `last_login_at` timestamp
- Created `teams` table for multi-user organizations:
  - `id`, `name`, `owner_id`, `subscription_tier`, `max_seats`, `created_at`
  - RLS: team members can read, only owner can update
- Created `team_members` junction table:
  - `team_id`, `user_id`, `role` (owner/admin/member/viewer), `invited_at`, `accepted_at`
- Created `audit_log` table for compliance:
  - `id`, `team_id`, `user_id`, `action`, `resource_type`, `resource_id`, `metadata` (JSONB), `ip_address`, `created_at`
  - Partitioned by month for query performance
  - RLS: only team admins can read
- Added 3 database functions:
  - `get_team_usage(team_id)` — returns invoice count, storage used, API calls this month
  - `check_seat_limit(team_id)` — validates team hasn't exceeded subscription seat limit
  - `log_audit_event(...)` — standardized audit log insertion
- Seeded subscription tier limits:
  - Free: 5 invoices/mo, 1 seat, no API access
  - Pro: 500 invoices/mo, 10 seats, API access
  - Enterprise: unlimited invoices, unlimited seats, API + webhooks + SSO

**Files Modified:**
- `supabase/migrations/002_enterprise_schema.sql` — All schema changes
- `src/lib/database.types.ts` — Updated TypeScript types from Supabase CLI
- `src/lib/teams.ts` — New team management helper functions

**Next Steps:**
- Build team management UI in dashboard
- Implement Stripe subscription integration
- Add SSO (SAML) for enterprise tier

---

### DATE: 2024-02-20 | TYPE: Invoice PDF Generation
**Agent:** Claude
**Status:** Complete — PDF generation with customizable templates

**Work Done:**
- Integrated `@react-pdf/renderer` for server-side PDF generation
- Built 3 invoice templates:
  - Standard: Clean, minimal design with company logo
  - Detailed: Includes payment terms, tax breakdown, bank details
  - International: Multi-currency with exchange rate footnotes
- Created API endpoint `POST /api/invoices/[id]/pdf` that:
  - Fetches invoice + line items + company branding from Supabase
  - Renders PDF using selected template
  - Returns PDF as binary stream with proper Content-Disposition header
  - Caches generated PDFs in Supabase Storage (bucket: `invoice-pdfs`)
- Added "Download PDF" and "Send via Email" buttons to invoice detail page
- Email sending via Resend API:
  - Professional email template with invoice summary
  - PDF attachment (max 10MB)
  - Tracking: `email_sent_at` and `email_opened_at` columns added to invoices table
- Fixed font loading issue: Google Fonts (Inter) weren't rendering in PDF — switched to embedded base64 font files

**Files Modified:**
- `src/lib/pdf-generator.ts` — PDF rendering engine
- `src/components/pdf/StandardTemplate.tsx` — Template 1
- `src/components/pdf/DetailedTemplate.tsx` — Template 2
- `src/components/pdf/InternationalTemplate.tsx` — Template 3
- `src/app/api/invoices/[id]/pdf/route.ts` — PDF API endpoint
- `src/app/api/invoices/[id]/email/route.ts` — Email sending endpoint
- `src/app/dashboard/invoices/[id]/page.tsx` — Added download/email buttons
- `supabase/migrations/003_email_tracking.sql` — Email tracking columns

**Next Steps:**
- Add invoice numbering system (configurable prefix + sequential)
- Build recurring invoice scheduler
- Add payment status tracking with webhook from Stripe
