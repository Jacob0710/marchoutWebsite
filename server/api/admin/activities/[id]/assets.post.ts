import { defineEventHandler, getRouterParam, readMultipartFormData } from 'h3'
import type { ActivityAssetKind } from '~/types/adminActivity'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireUuid(getRouterParam(event, 'id'), 'Activity')
  await getAdminActivity(supabase, id)

  const parts = await readMultipartFormData(event)
  if (!parts) throw apiError(400, 'VALIDATION_ERROR', 'Multipart form data is required.')
  const files = parts.filter((part) => part.name === 'file' && part.filename)
  if (files.length !== 1) throw apiError(400, 'VALIDATION_ERROR', 'Exactly one file is required.')
  const readField = (name: string) => parts.find((part) => part.name === name && !part.filename)?.data.toString('utf8').trim()
  const kind = readField('kind') as ActivityAssetKind
  if (!['image', 'attachment'].includes(kind)) throw apiError(400, 'VALIDATION_ERROR', 'Asset kind must be image or attachment.')
  const altText = readField('altText') || null
  if (altText && altText.length > 500) throw apiError(400, 'VALIDATION_ERROR', 'Alt text is too long.')
  const rawSortOrder = readField('sortOrder')
  const sortOrder = rawSortOrder === undefined || rawSortOrder === '' ? 0 : Number(rawSortOrder)
  if (!Number.isInteger(sortOrder) || sortOrder < 0) throw apiError(400, 'VALIDATION_ERROR', 'Sort order must be a non-negative integer.')

  const file = files[0]!
  const data = new Uint8Array(file.data)
  const filename = file.filename || 'upload'
  const mimeType = file.type || 'application/octet-stream'
  const extension = validateAssetUpload({ kind, filename, mimeType, data })
  const storagePath = makeActivityAssetPath(id, kind, extension)
  const { error: uploadError } = await supabase.storage
    .from(activityAssetsBucket)
    .upload(storagePath, data, { contentType: mimeType, upsert: false, cacheControl: '3600' })
  if (uploadError) throw apiError(502, 'STORAGE_ERROR', 'File upload failed.')

  const { data: metadata, error: metadataError } = await supabase.from('activity_assets').insert({
    activity_id: id,
    kind,
    storage_bucket: activityAssetsBucket,
    storage_path: storagePath,
    original_name: filename.slice(0, 255),
    mime_type: mimeType,
    size_bytes: data.length,
    alt_text: kind === 'image' ? altText : null,
    sort_order: sortOrder,
    created_by: user.id
  }).select('id').single()

  if (metadataError) {
    const { error: rollbackError } = await supabase.storage.from(activityAssetsBucket).remove([storagePath])
    if (rollbackError) console.error('Phase 6 upload rollback requires retry.', { activityId: id, paths: [storagePath] })
    throw internalApiError()
  }
  const activity = await getAdminActivity(supabase, id)
  return { asset: activity.assets.find((asset) => asset.id === metadata.id)! }
})
