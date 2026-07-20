import type { SupabaseClient } from '@supabase/supabase-js'
import { readMultipartFormData, type H3Event } from 'h3'

export const replaceFileUpload = async (event: H3Event, supabase: SupabaseClient, userId: string, id: string) => {
  const current = await requireExistingRow(supabase.from('files').select('id,storage_path').eq('id', id).maybeSingle())
  const parts = await readMultipartFormData(event)
  const files = parts?.filter((part) => part.name === 'file' && part.filename) ?? []
  if (files.length !== 1) throw apiError(400, 'VALIDATION_ERROR', 'Exactly one file is required.')
  const file = files[0]!
  const bytes = new Uint8Array(file.data)
  const mimeType = file.type || ''
  const filename = (file.filename || 'download').slice(0, 255)
  const extension = validateContentUpload({ kind: 'document', filename, mimeType, data: bytes })
  const path = makeDownloadPath(id, extension)
  const { error: uploadError } = await supabase.storage.from(downloadsBucket).upload(path, bytes, { contentType: mimeType, upsert: false, cacheControl: '3600' })
  if (uploadError) throw apiError(502, 'STORAGE_ERROR', 'File upload failed.')
  const { data, error } = await supabase.from('files').update({
    storage_path: path,
    original_filename: filename,
    mime_type: mimeType,
    size_bytes: bytes.length,
    file_type: extension.toUpperCase(),
    updated_by: userId
  }).eq('id', id).select(fileSelect).single()
  if (error) {
    await supabase.storage.from(downloadsBucket).remove([path])
    throwContentDatabaseError(error)
  }
  const cleanupWarning = await deleteStorageObject(supabase, downloadsBucket, current.storage_path)
  return { item: mapAdminFile(data as unknown as FileRow), cleanupWarning }
}
