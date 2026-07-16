import { defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireUuid(getRouterParam(event, 'id'), 'Activity')
  const current = await getAdminActivity(supabase, id)
  const { values } = validateActivityPayload(await readBody(event))
  const databasePatch = toActivityDatabasePatch(values as Record<string, unknown>)

  if (current.status === 'published') {
    validatePublishable({
      title: (databasePatch.title as string | undefined) ?? current.title,
      slug: (databasePatch.slug as string | undefined) ?? current.slug,
      academic_year: (databasePatch.academic_year as number | undefined) ?? current.academicYear,
      activity_type: (databasePatch.activity_type as string | undefined) ?? current.activityType,
      event_date: databasePatch.event_date === undefined ? current.eventDate : databasePatch.event_date as string | null,
      location: databasePatch.location === undefined ? current.location : databasePatch.location as string | null,
      participants_count: (databasePatch.participants_count as number | undefined) ?? current.participantsCount,
      result_summary: databasePatch.result_summary === undefined ? current.resultSummary : databasePatch.result_summary as string | null,
      content: databasePatch.content === undefined ? current.content : databasePatch.content as string | null
    })
  }

  const { error } = await supabase.from('activities').update({
    ...databasePatch,
    updated_by: user.id,
    updated_at: new Date().toISOString()
  }).eq('id', id)
  if (error) {
    if (isUniqueViolation(error)) throw apiError(409, 'SLUG_CONFLICT', 'Slug is already in use.', { slug: ['此 Slug 已被使用。'] })
    throw internalApiError()
  }
  return { activity: await getAdminActivity(supabase, id) }
})
