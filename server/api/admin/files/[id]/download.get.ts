import { getRouterParam } from 'h3'
export default defineStorageProxyHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'File')
  const row = await requireExistingRow(supabase.from('files').select('storage_path,original_filename,mime_type,size_bytes').eq('id', id).maybeSingle())
  if (!row.storage_path || !row.original_filename) throw apiError(404, 'NOT_FOUND', 'File upload not found.')
  return sendStorageProxyObject({
    event,
    supabase,
    bucket: downloadsBucket,
    path: row.storage_path,
    kind: 'download',
    expectedMimeType: row.mime_type,
    expectedSizeBytes: row.size_bytes,
    disposition: 'attachment',
    downloadName: row.original_filename
  })
})
