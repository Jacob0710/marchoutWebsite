# March Out For Love | 愛潮關懷社

Nuxt 3 + Vue 3 + TypeScript site for March Out For Love. This phase uses local mock data only and keeps Supabase integration ready for a later phase.

## Stack

- Nuxt 3
- Vue 3 + TypeScript
- Tailwind CSS
- Mock data in `utils/mockData.ts`
- Supabase schema draft in `supabase/schema.sql`

## Setup

```bash
npm install
npm run dev
```

The development server defaults to `http://localhost:3000`.

## Scripts

```bash
npm run dev
npm run build
npm run generate
npm run preview
```

## Environment

Copy `.env.example` to `.env` when Supabase integration begins.

```env
NUXT_PUBLIC_SUPABASE_URL=
NUXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_ACTIVITY_IMAGES_BUCKET=activity-images
SUPABASE_PUBLIC_FILES_BUCKET=public-files
```

This public frontend phase does not require a Supabase service-role key. Never add one to Nuxt public runtime configuration or client-side code.

## Supabase Integration

Phase 4 adds the Supabase client and an admin repository layer.

- If `NUXT_PUBLIC_SUPABASE_URL` and `NUXT_PUBLIC_SUPABASE_ANON_KEY` are empty, admin pages keep using the local mock store.
- If both values are set, admin auth uses Supabase `signInWithPassword`.
- Admin activities, posts, files, FAQ, and settings use Supabase CRUD through `composables/useAdminRepository.ts`.
- File upload uses Supabase Storage bucket `public-files` when configured.
- Public pages still keep the mock-data fallback so the site remains usable before database setup.

## Content Model

Current content is centralized in `utils/mockData.ts`:

- Activities
- Posts
- Files
- FAQ
- Programs
- Year summaries
- Site settings

The shape mirrors the future Supabase tables so Phase 4 can replace local reads with database queries.

## Public Pages

- `/`
- `/about`
- `/organization`
- `/programs`
- `/programs/breakfast`
- `/programs/exploration`
- `/activities`
- `/activities/[slug]`
- `/news`
- `/news/[slug]`
- `/years`
- `/years/[year]`
- `/files`
- `/faq`
- `/contact`

## Admin Pages

- `/admin/login`
- `/admin/dashboard`
- `/admin/activities`
- `/admin/activities/create`
- `/admin/activities/edit/[id]`
- `/admin/posts`
- `/admin/posts/create`
- `/admin/posts/edit/[id]`
- `/admin/files`
- `/admin/categories`
- `/admin/years`
- `/admin/faq`
- `/admin/settings`

Admin pages are UI-only in this phase. Real auth, CRUD and route protection belong to the Supabase integration phase.

## Cloudflare Pages

Recommended settings after dependencies are installed:

- Build command: `npm run build`
- Output directory: `.output/public` for generated static output or `.output` for Nuxt/Nitro deployment
- Environment variables: set public Supabase URL and anon key only after Phase 4

## Next Phases

1. Wire admin forms to a temporary local store or Supabase client.
2. Add Supabase Auth and protected admin middleware.
3. Replace mock composables with database fetches.
4. Add Storage upload flow for images and files.
5. Add role-based admin permissions.
