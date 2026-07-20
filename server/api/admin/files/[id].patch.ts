import { defineEventHandler, getRouterParam, readBody } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'File')
  const input = validateFileMetadata(await readBody(event), true)
  const payload: Record<string, unknown> = { updated_by: user.id }
  if (input.title !== undefined) payload.title = input.title
  if (input.description !== undefined) payload.description = input.description || null
  if (input.academicYear !== undefined) payload.academic_year = input.academicYear
  if (input.category !== undefined) payload.category = input.category || null
  if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder
  const { data, error } = await supabase.from('files').update(payload).eq('id', id).select(fileSelect).maybeSingle()
  throwContentDatabaseError(error)
  if (!data) throw apiError(404, 'NOT_FOUND', 'File not found.')
  return { item: mapAdminFile(data as unknown as FileRow) }
})
