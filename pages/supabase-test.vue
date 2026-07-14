<script setup lang="ts">
interface ActivityDiagnosticRow {
  id: string
  title: string
  event_date: string | null
  location: string | null
}

if (!import.meta.dev) {
  throw createError({ statusCode: 404, statusMessage: 'Page not found' })
}

const { isSupabaseConfigured } = useSupabaseConfig()

const { data: activities, error, pending } = await useAsyncData<ActivityDiagnosticRow[]>(
  'supabase-activities-test',
  async () => {
    if (!isSupabaseConfigured) return []

    const supabase = useSupabaseClient()
    if (!supabase) throw new Error('Public Supabase client is unavailable.')

    const { data, error: queryError } = await supabase
      .from('activities')
      .select('id,title,event_date,location')
      .eq('status', 'published')
      .order('event_date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true })

    if (queryError) throw new Error('Public activity query failed.')
    return (data ?? []) as ActivityDiagnosticRow[]
  },
  { default: () => [] }
)
</script>

<template>
  <main class="page-shell py-12">
    <h1 class="text-2xl font-bold text-ink">Supabase Activities Test</h1>

    <p v-if="!isSupabaseConfigured" class="mt-4 rounded-lg bg-honey/15 p-4 text-ink">
      Supabase public environment variables are not configured. The application is using mock data.
    </p>
    <p v-else-if="pending" class="mt-4 text-muted">Loading...</p>
    <p v-else-if="error" class="mt-4 rounded-lg bg-red-50 p-4 text-red-700">
      Public activity query failed. Check the local public Supabase configuration and RLS policy.
    </p>
    <template v-else>
      <p class="mt-4 text-muted">Activities count: {{ activities.length }}</p>
      <div v-if="activities.length" class="mt-6 grid gap-3">
        <article v-for="activity in activities" :key="activity.id" class="rounded-lg border border-slate-200 p-4">
          <h2 class="font-bold text-ink">{{ activity.title }}</h2>
          <p class="mt-1 text-sm text-muted">{{ activity.event_date }} | {{ activity.location }}</p>
        </article>
      </div>
      <p v-else class="mt-6 text-muted">No published activities found. Run supabase/seed.sql in the Supabase SQL Editor.</p>
    </template>
  </main>
</template>
