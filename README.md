# March Out For Love | 愛潮關懷社

March Out For Love is a Nuxt 3 SSR website and content administration platform. Phases 4–8 provide the Supabase public frontend, secure administrator authentication, activity CRUD with private assets, administrator access governance, and the formalized posts, downloads, FAQ, year summaries, and site-settings platform.

## Stack

- Nuxt 3, Vue 3, TypeScript, Nitro SSR
- Tailwind CSS and Lucide icons
- Supabase Auth, Postgres, Row Level Security, and private Storage
- Server-owned H3 APIs for all formal content mutations
- Local public mock data when both Supabase public variables are intentionally absent

## Install and run

Use the committed pnpm lockfile and Node 24 or a compatible current Node release.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

The development server defaults to `http://localhost:3000`.

Production checks and preview:

```bash
pnpm typecheck
pnpm build
pnpm preview
```

Regression suites require the corresponding local test-account variables and a running preview:

```bash
pnpm test:phase5
pnpm test:phase6
pnpm test:phase7
pnpm test:phase8
```

Each smoke suite creates isolated fixtures and removes them before exit.

## Environment

Copy `.env.example` to `.env` for local development. Deployment variables belong in the hosting platform, never in Git.

Required for Supabase mode:

```env
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
NUXT_PUBLIC_SITE_URL=https://example.invalid
SUPABASE_ACTIVITY_ASSETS_BUCKET=activity-assets
SUPABASE_CONTENT_ASSETS_BUCKET=content-assets
SUPABASE_DOWNLOADS_BUCKET=downloads
```

The URL and anon key must either both be configured or both be absent. Partial configuration returns a stable `503` and never falls back to mock data. Do not add a service-role key, database password, private key, or Auth Admin API credential to this application.

Smoke-account placeholders are documented in `.env.example`. Keep real test credentials in ignored local or deployment-secret files.

## Data modes

### Supabase mode

When both public Supabase variables exist, public SSR and every administrator content operation use the server API. Auth cookies are read by Nitro, administrator status is rechecked, and Postgres RLS remains the final authorization boundary. Database or network errors are returned as stable API errors; they do not trigger mock fallback.

### Mock mode

When both public Supabase variables are absent, public routes use the local fixtures in `utils/mockData.ts`. Formal administrator APIs return `503`; mock mode is not an alternate administrator datastore. This keeps public UI development available without weakening production behavior.

## Supabase migrations

Files in `supabase/migrations/` are the canonical schema. Apply them in filename order:

1. `20260714_001_admin_users.sql`
2. `20260714_002_admin_activity_read_policy.sql`
3. `20260715_001_phase6_activity_crud_assets.sql`
4. `20260716_001_phase7_admin_access_governance.sql`
5. `20260720_001_phase8_core_content_platform.sql`

`supabase/schema.sql` is a deliberately non-executable legacy notice, not a bootstrap script. For a fresh project, apply all migrations and then run the verification files described in `supabase/README.md`.

The private buckets are:

- `activity-assets` for Phase 6 activity assets
- `content-assets` for post and year-summary covers
- `downloads` for published downloadable files

The legacy `activity-images` and `public-files` buckets are made private by Phase 8. Public users receive assets only through scoped server proxy routes after the related content has passed published-state checks. Raw Storage paths are not part of the public API.

## Administrator lifecycle

`/admin/login` uses Supabase password authentication. The server session endpoint and `requireAdmin` enforce that the authenticated user has an active `admin_users` row. Deactivation takes effect on the next protected request; a valid Supabase login alone is insufficient.

Active administrators can use `/admin/access` to create one-time invitations, revoke pending invitations, inspect the append-only audit trail, and activate or deactivate other administrators. Last-active-admin and self-deactivation safeguards remain in force.

All mutating administrator APIs require:

- a valid signed-in session;
- active administrator membership;
- same-origin request validation;
- request validation and stable error mapping;
- RLS authorization using the user's JWT.

## Content modules

- Activities: CRUD, publish lifecycle, image/attachment/video management, private proxies
- Posts: CRUD, featured flag, draft/publish lifecycle, private cover management, public list/detail
- Files: metadata, validated upload/replace, draft/publish lifecycle, private download proxy
- FAQ: CRUD, active state, atomic ordering, accessible public accordion
- Year summaries: unique academic year, highlights, statistics, cover, optional report relation, publish lifecycle
- Site settings: database-enforced singleton, public identity/contact/footer data, administrator editing
- Categories: the three established values remain read-only; Phase 8 does not introduce a taxonomy editor

Public content routes include `/activities`, `/news`, `/files`, `/faq`, `/years`, `/about`, and `/contact`. Draft or inactive records never appear publicly, and unpublished detail routes return `404`.

## Security boundaries

- Browser components never perform formal content writes directly against Supabase.
- The anon key plus the signed-in user's JWT is used; the application has no elevated database secret.
- Content tables have RLS enabled. Public policies are read-only and published/active scoped.
- Administrator table and Storage mutations require the database `is_admin()` predicate, which checks an active `admin_users` row.
- Private asset/download responses are non-cacheable at the proxy boundary where user-specific authorization or publication checks apply.
- Database-authored body text is rendered as text, not unsafe HTML.
- API responses expose stable codes and do not return raw Supabase errors.

See `docs/architecture.md` for request and data flows.

## Deployment readiness

This application requires a Nitro-capable SSR deployment; static-only hosting is insufficient for secure cookies, administrator APIs, and private asset proxies. Configure the public site URL and Supabase redirect allow-list for each environment, run every migration and verification query, and execute all four smoke suites against staging before production promotion.

The project is implementation-ready but not deployed by Phase 8. Platform selection, staging infrastructure, production DNS, security-header tuning, monitoring, backups, and CI/CD remain deployment work. See `docs/deployment-readiness.md`.

## Known limitations and next phase

- Existing legacy file URL columns are preserved for a later controlled object migration; new Phase 8 writes use private Storage paths.
- Rich text is intentionally plain safe text; no Markdown editor or sanitizer pipeline is included.
- Logo upload, arbitrary category management, revisions, scheduling, analytics, search indexing, and bulk import are out of scope.
- Phase 9 should prioritize legacy object inventory/migration, reusable content-editor improvements, operational observability, and staging E2E preparation without weakening the current RLS and server-API boundaries.
