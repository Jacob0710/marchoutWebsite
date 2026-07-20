import { defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const input = validateFileMetadata(await readBody(event))
  const { data, error } = await supabase.from('files').insert({
    title: input.title!, description: input.description || null,
    academic_year: input.academicYear ?? null, category: input.category || null,
    sort_order: input.sortOrder ?? 0, status: 'draft', created_by: user.id, updated_by: user.id
  }).select(fileSelect).single()
  throwContentDatabaseError(error)
  return { item: mapAdminFile(data as unknown as FileRow) }
})
