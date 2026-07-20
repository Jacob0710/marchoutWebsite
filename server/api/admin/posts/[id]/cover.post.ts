import { defineEventHandler, getRouterParam, readMultipartFormData } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireContentUuid(getRouterParam(event, 'id'), 'Post')
  const current = await requireExistingRow(supabase.from('posts').select('id,cover_storage_path').eq('id', id).maybeSingle())
  const parts = await readMultipartFormData(event)
  const files = parts?.filter((part) => part.name === 'file' && part.filename) ?? []
  if (files.length !== 1) throw apiError(400, 'VALIDATION_ERROR', 'Exactly one image is required.')
  const file = files[0]!
  const altText = parts?.find((part) => part.name === 'altText' && !part.filename)?.data.toString('utf8').trim() ?? ''
  if (altText.length > 300) throw apiError(400, 'VALIDATION_ERROR', 'Cover alt text is too long.')
  const bytes = new Uint8Array(file.data)
  const mimeType = file.type || ''
  const extension = validateContentUpload({ kind: 'image', filename: file.filename || 'cover', mimeType, data: bytes })
  const path = makeContentAssetPath('posts', id, extension)
  const { error: uploadError } = await supabase.storage.from(contentAssetsBucket).upload(path, bytes, { contentType: mimeType, upsert: false, cacheControl: '3600' })
  if (uploadError) throw apiError(502, 'STORAGE_ERROR', 'Cover upload failed.')
  const { data, error } = await supabase.from('posts').update({ cover_storage_path: path, cover_alt: altText || null, updated_by: user.id }).eq('id', id).select(postSelect).single()
  if (error) {
    await supabase.storage.from(contentAssetsBucket).remove([path])
    throwContentDatabaseError(error)
  }
  const cleanupWarning = await deleteStorageObject(supabase, contentAssetsBucket, current.cover_storage_path)
  return { item: mapAdminPost(data as unknown as PostRow), cleanupWarning }
})
