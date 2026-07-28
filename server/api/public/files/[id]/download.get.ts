import { getRouterParam } from 'h3'
export default defineStorageProxyHandler(async (event) => {
  const id = requireContentUuid(getRouterParam(event, 'id'), 'File')
  const supabase = createSupabaseAnonServerClient(event)
  const { data: rows, error } = await supabase.rpc('phase10_get_public_file_download', { p_file_id: id })
  let row = rows?.[0]
  if (isPhase10RpcUnavailable(error)) {
    const fallback = await supabase.from('files').select('storage_path,original_filename,mime_type,size_bytes').eq('id', id).maybeSingle()
    if (!fallback.error && fallback.data?.storage_path && fallback.data.original_filename) {
      row = {
        active_storage_path: fallback.data.storage_path,
        download_name: fallback.data.original_filename,
        active_mime_type: fallback.data.mime_type,
        active_size_bytes: fallback.data.size_bytes
      }
    }
  }
  if ((error && !isPhase10RpcUnavailable(error)) || !row?.active_storage_path || !row.download_name) throw apiError(404, 'NOT_FOUND', 'File not found.')
  return sendStorageProxyObject({
    event,
    supabase,
    bucket: downloadsBucket,
    path: row.active_storage_path,
    kind: 'download',
    expectedMimeType: row.active_mime_type,
    expectedSizeBytes: row.active_size_bytes,
    expectedSha256: row.active_sha256,
    disposition: 'attachment',
    downloadName: row.download_name
  })
})
