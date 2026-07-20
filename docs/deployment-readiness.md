# Deployment readiness

Phase 8 prepares the application for staging and production deployment but does not select or configure a paid platform, DNS, or live environment.

## Runtime requirements

- A Node-compatible Nitro SSR runtime is required.
- The platform must preserve `Set-Cookie`, forward request cookies, support all H3 methods, and stream binary proxy responses.
- Static-only hosting is not sufficient for administrator sessions, protected Server APIs, signed Storage fetches, or public download proxies.
- Build command: `pnpm install --frozen-lockfile && pnpm build`.
- Runtime entry point: `node .output/server/index.mjs`.
- Health checks should use a public SSR route and a small public API route, not an administrator endpoint.

Candidate platforms include a Node server/container, Nuxt-compatible serverless hosting, or Cloudflare only with a verified Nitro preset and complete cookie/binary-response testing. Platform choice remains an operational decision.

## Environment and cookies

Set the following as environment variables in each deployment environment:

- `NUXT_PUBLIC_SUPABASE_URL`
- `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- `NUXT_PUBLIC_SITE_URL`
- `SUPABASE_ACTIVITY_ASSETS_BUCKET=activity-assets`
- `SUPABASE_CONTENT_ASSETS_BUCKET=content-assets`
- `SUPABASE_DOWNLOADS_BUCKET=downloads`

The URL and anon key must both be set. Never configure a service-role key, database URL/password, private key, or Supabase Auth Admin API secret in this application.

Production must use HTTPS so auth cookies receive appropriate secure behavior. Validate cookie domain, `SameSite`, proxy trust, forwarded host/protocol, logout expiry, and cross-subdomain behavior on the chosen platform.

## Supabase configuration

Before deploying application code:

1. Back up the database and inventory legacy Storage objects.
2. Apply all migrations from `supabase/migrations` in filename order.
3. Run Phase 5–8 SQL verification scripts.
4. Confirm `activity-assets`, `content-assets`, and `downloads` are private.
5. Confirm legacy `activity-images` and `public-files` are not public.
6. Add the exact staging/production site and invitation callback URLs to the Supabase Auth redirect allow-list.
7. Create or validate the first active administrator through the documented trusted bootstrap procedure.
8. Confirm no application environment contains elevated Supabase credentials.

SQL Editor history is not a migration registry. Preserve deployment logs outside the repository and record the applied commit/tag per environment.

## Private asset proxy

The hosting platform must permit server-side outbound HTTPS access to Supabase Storage and binary response bodies. Validate:

- post and year covers load only for published content on public routes;
- file downloads return safe filenames and MIME headers;
- draft/unpublished objects return `404` publicly;
- administrator previews require an active session and return private/no-store cache headers;
- CDN or platform caching cannot bypass publication checks;
- raw bucket paths and signed URLs are not captured in public logs or analytics.

## Security headers

Define and test headers at the platform or Nitro layer after the final hosting origin is known:

- Content-Security-Policy tailored to Supabase, YouTube embeds, images, and fonts actually used;
- `Strict-Transport-Security` after HTTPS/domain validation;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy`;
- frame restrictions compatible with intended embedded content;
- a minimal `Permissions-Policy`.

Do not enable broad caching for `/api/admin/**`, authenticated asset proxies, or responses containing session-dependent state.

## Staging requirements

Staging should use a separate Supabase project or isolated schema/data set and non-production administrator accounts. It must match production cookie, redirect, bucket, and Nitro behavior.

Required acceptance:

- `pnpm typecheck` and `pnpm build` from a clean checkout;
- Phase 5, 6, 7, and 8 smoke suites;
- read-only SQL verification;
- anonymous, non-admin, inactive-admin, and active-admin identity matrix;
- full post/file/FAQ/year/settings Browser CRUD;
- upload, replace, publish, unpublish, delete, and orphan scan;
- SSR `404`, hydration, keyboard/focus, mobile viewport, and console checks;
- invitation acceptance with the real staging redirect URL;
- restore all fixtures, settings, and administrator state.

## Production checklist

- [ ] Release is based on the reviewed Phase 8 tag or a known descendant.
- [ ] Database backup and Storage inventory completed.
- [ ] Ordered migrations applied and verification passed.
- [ ] Required buckets exist and are private.
- [ ] Environment contains only public Supabase application credentials.
- [ ] Exact site/redirect URLs configured.
- [ ] At least two trusted active administrators exist for operational continuity.
- [ ] Smoke and Browser acceptance passed on staging.
- [ ] Error monitoring, request logging, uptime checks, and alert ownership configured.
- [ ] Logs redact cookies, authorization headers, invitation tokens, signed URLs, and form secrets.
- [ ] Backup retention and restore drill ownership documented.
- [ ] Rollback owner and maintenance window agreed.
- [ ] DNS, TLS, CSP, and caching behavior verified.

## Rollback posture

Application rollback can redeploy the prior known image/commit, but database rollback is not an automatic down migration. Before migration, take a recoverable database backup and Storage inventory. Phase 8 intentionally keeps legacy URL columns and does not delete legacy bucket objects, reducing immediate data-migration risk. If a database issue occurs, stop content mutations, preserve evidence, and restore or apply a reviewed forward fix rather than improvising destructive SQL.

## Deferred deployment work

Phase 12 remains blocked on external platform decisions and production authority, including hosting selection, DNS/TLS, production Supabase configuration, billing, monitoring vendors, incident ownership, CI/CD, staging data policy, and a production release window. Those items require the relevant account owners and are intentionally not performed by Phase 8.
