import { defineEventHandler, readBody } from 'h3'
import { toActivitySlug } from '~/shared/activityRules'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const { values, provided } = validateActivityPayload(await readBody(event), true)
  const title = values.title!
  const slug = values.slug || toActivitySlug(title) || `draft-${crypto.randomUUID().slice(0, 12)}`
  const payload = {
    title,
    slug,
    academic_year: values.academicYear ?? Math.max(1, new Date().getFullYear() - 1911),
    activity_type: values.activityType ?? 'regular',
    event_date: values.eventDate ?? null,
    location: values.location ?? null,
    participants_count: provided.has('participantsCount') ? values.participantsCount ?? null : 0,
    result_summary: values.resultSummary ?? null,
    content: values.content ?? null,
    status: 'draft',
    is_featured: values.isFeatured ?? false,
    tags: values.tags ?? [],
    created_by: user.id,
    updated_by: user.id,
    updated_at: new Date().toISOString()
  }
  const { data, error } = await supabase.from('activities').insert(payload).select('id').single()
  if (error) {
    if (isUniqueViolation(error)) throw apiError(409, 'SLUG_CONFLICT', 'Slug is already in use.', { slug: ['此 Slug 已被使用。'] })
    throw internalApiError()
  }
  return { activity: await getAdminActivity(supabase, data.id) }
})
