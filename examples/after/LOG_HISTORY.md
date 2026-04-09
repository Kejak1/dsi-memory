# Project Alpha — Log History

> SaaS Platform for B2B Invoice Management
> Stack: Next.js 14 / TypeScript / Supabase / Vercel

---

### 🏛️ Heritage Summary
Platform scaffolded on Next.js 14 with Supabase. Auth migrated from Auth0 to Supabase Auth in January to eliminate $5k/mo projected costs (15k users migrated, zero downtime). Database expanded in February with enterprise tiers, teams, and audit logging. Invoice PDF generation added with 3 templates and Resend email integration.

### 🗜️ DSI Archive Index
`[2024-01-08] ENTITY:project_init | ACT:scaffold:NextJS_Supabase_Vercel | WHY:foundation | RES:success_deployed_iad1 | REF:cold_storage/log_archive_jan.md`
`[2024-01-14] ENTITY:auth | ACT:migrate:Auth0->Supabase | WHY:cost_scaling_b2b_5k_mo | RES:success_15247_users_zero_downtime | REF:cold_storage/log_archive_jan.md`
`[2024-02-05] ENTITY:db_schema | ACT:expand:enterprise_teams_audit | WHY:b2b_tier_support | RES:success_3_tables_3_functions | REF:cold_storage/log_archive_feb.md`
`[2024-02-20] ENTITY:invoice_pdf | ACT:build:3_templates_email | WHY:core_feature | RES:success_resend_integrated | REF:cold_storage/log_archive_feb.md`
