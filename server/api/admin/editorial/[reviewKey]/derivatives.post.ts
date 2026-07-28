import { defineEventHandler, getRouterParam, readMultipartFormData, setResponseHeader } from 'h3'
import type { EditorialReviewDetail } from '~/types/editorial'

interface ActivityAssetSource {
  id: string
  activity_id: string
  kind: 'image' | 'attachment'
  storage_bucket: string
  storage_path: string
  original_sha256: string | null
  mime_type: string
  privacy_state: string
}

interface FileSource {
  id: string
  storage_path: string | null
  original_sha256: string | null
  mime_type: string | null
  privacy_state: string
}

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const reviewKey = requireEditorialReviewKey(getRouterParam(event, 'reviewKey'))
  const { data: detailData, error: detailError } = await supabase.rpc('phase10_get_editorial_review', { p_review_key: reviewKey })
  throwEditorialRpcError(detailError)
  const detail = camelizeEditorial(detailData) as EditorialReviewDetail
  if (!detail.target) throw apiError(400, 'VALIDATION_ERROR', 'Redirect reviews do not accept derivatives.')

  const parts = await readMultipartFormData(event)
  const fileParts = parts?.filter((part) => part.name === 'file' && part.filename) ?? []
  const assetParts = parts?.filter((part) => part.name === 'assetId' && !part.filename) ?? []
  if (fileParts.length !== 1 || assetParts.length !== 1) {
    throw apiError(400, 'VALIDATION_ERROR', 'Exactly one derivative file and asset ID are required.')
  }
  const assetId = parseDerivativeAssetId(assetParts[0]!.data.toString('utf8').trim())
  const upload = fileParts[0]!
  const bytes = new Uint8Array(upload.data)
  const filename = (upload.filename || 'redacted').slice(0, 255)
  const mimeType = upload.type || ''

  let assetKind: 'activity-asset' | 'file'
  let originalBucket: 'activity-assets' | 'downloads'
  let originalPath: string
  let originalSha256: string
  let extension: string
  let derivativePath: string

  if (detail.target.targetKind === 'activity') {
    const { data, error } = await supabase.from('activity_assets')
      .select('id,activity_id,kind,storage_bucket,storage_path,original_sha256,mime_type,privacy_state')
      .eq('id', assetId).eq('activity_id', detail.target.targetId).maybeSingle()
    if (error) throw internalApiError()
    const source = data as ActivityAssetSource | null
    if (!source) throw apiError(404, 'ASSET_NOT_FOUND', 'Editorial asset not found.')
    if (source.privacy_state !== 'redaction-required') throw apiError(409, 'DERIVATIVE_NOT_REQUIRED', 'This asset is not awaiting redaction.')
    if (!source.original_sha256) throw apiError(409, 'BOOTSTRAP_INCOMPLETE', 'The original asset hash is unavailable.')
    const flattenedDocx = source.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && mimeType === 'application/pdf'
    if (mimeType !== source.mime_type && !flattenedDocx) throw apiError(415, 'UNSUPPORTED_FILE_TYPE', 'The derivative must retain its raster/PDF type or flatten DOCX to PDF.')
    extension = validateAssetUpload({ kind: source.kind, filename, mimeType, data: bytes })
    assetKind = 'activity-asset'
    originalBucket = 'activity-assets'
    originalPath = source.storage_path
    originalSha256 = source.original_sha256
    derivativePath = `${source.activity_id}/phase10-redacted/${assetId}/${crypto.randomUUID()}.${extension}`
  } else if (detail.target.targetKind === 'file') {
    const { data, error } = await supabase.from('files')
      .select('id,storage_path,original_sha256,mime_type,privacy_state')
      .eq('id', assetId).eq('id', detail.target.targetId).maybeSingle()
    if (error) throw internalApiError()
    const source = data as FileSource | null
    if (!source?.storage_path) throw apiError(404, 'ASSET_NOT_FOUND', 'Editorial file not found.')
    if (source.privacy_state !== 'redaction-required') throw apiError(409, 'DERIVATIVE_NOT_REQUIRED', 'This file is not awaiting redaction.')
    if (!source.original_sha256) throw apiError(409, 'BOOTSTRAP_INCOMPLETE', 'The original file hash is unavailable.')
    const flattenedDocx = source.mime_type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && mimeType === 'application/pdf'
    if (mimeType !== source.mime_type && !flattenedDocx) throw apiError(415, 'UNSUPPORTED_FILE_TYPE', 'The derivative must retain PDF type or flatten DOCX to PDF.')
    extension = validateContentUpload({ kind: 'document', filename, mimeType, data: bytes })
    assetKind = 'file'
    originalBucket = 'downloads'
    originalPath = source.storage_path
    originalSha256 = source.original_sha256
    derivativePath = `files/${assetId}/phase10-redacted/${crypto.randomUUID()}.${extension}`
  } else {
    throw apiError(400, 'VALIDATION_ERROR', 'This target type has no redactable asset.')
  }

  let inspectionSummary: ReturnType<typeof inspectRedactedDerivative>
  try { inspectionSummary = inspectRedactedDerivative(mimeType, bytes) } catch (error) {
    if (error instanceof RedactedDerivativeInspectionError) throw apiError(400, 'INVALID_DERIVATIVE', error.message)
    throw internalApiError()
  }
  const derivativeOriginalName = safeDownloadName(filename)
  const redactionMethod = mimeType === 'application/pdf' ? 'operator-uploaded-flattened-pdf' : 'operator-uploaded-metadata-stripped-raster'
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  const derivativeSha256 = [...digest].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  if (derivativeSha256 === originalSha256) throw apiError(400, 'INVALID_DERIVATIVE', 'The derivative must differ from the private original.')
  const { error: uploadError } = await supabase.storage.from(originalBucket).upload(derivativePath, bytes, {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: false
  })
  if (uploadError) throw apiError(502, 'STORAGE_ERROR', 'Derivative upload failed.')

  const { data, error } = await supabase.rpc('phase10_register_redacted_derivative', {
    p_asset_kind: assetKind,
    p_asset_id: assetId,
    p_original_bucket: originalBucket,
    p_original_path: originalPath,
    p_original_sha256: originalSha256,
    p_derivative_bucket: originalBucket,
    p_derivative_path: derivativePath,
    p_derivative_sha256: derivativeSha256,
    p_derivative_mime_type: mimeType,
    p_derivative_original_name: derivativeOriginalName,
    p_derivative_size_bytes: bytes.length,
    p_redaction_method: redactionMethod,
    p_inspection_summary: inspectionSummary,
    p_correlation_id: crypto.randomUUID()
  })
  if (error) {
    await supabase.storage.from(originalBucket).remove([derivativePath])
    throwEditorialRpcError(error)
  }
  return { derivative: camelizeEditorial(data) }
})
