import { defineEventHandler, getRouterParam } from 'h3'
export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'File')
  const item = await requireExistingRow(supabase.from('files').select(fileSelect).eq('id', id).maybeSingle())
  return { item: mapAdminFile(item as unknown as FileRow) }
})
