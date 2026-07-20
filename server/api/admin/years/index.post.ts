import { defineEventHandler, readBody } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const input = validateYearInput(await readBody(event))
  const { data, error } = await supabase.from('year_summaries').insert({
    academic_year: input.academicYear!, title: input.title!, theme: input.theme || null,
    summary: input.summary!, highlights: input.highlights ?? [], statistics: input.statistics ?? [],
    cover_alt: input.coverAlt || null, report_file_id: input.reportFileId ?? null,
    sort_order: input.sortOrder ?? 0, status: 'draft', created_by: user.id, updated_by: user.id
  }).select(yearSelect).single()
  throwContentDatabaseError(error)
  return { item: mapAdminYear(data as unknown as YearRow) }
})
