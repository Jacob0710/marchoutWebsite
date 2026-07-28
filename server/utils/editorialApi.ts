import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js'
import type { EditorialDecision, EditorialReviewUpdateInput, EditorialSeverity, EditorialState, EditorialTargetKind } from '~/types/editorial'
import type { ApiErrorCode } from '~/server/utils/apiErrors'

const sha256Pattern = /^[0-9a-f]{64}$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const reviewKeyPattern = /^P9-[0-9]{4}$/
const batchKeyPattern = /^[a-z0-9][a-z0-9-]{2,99}$/
const sourceKeyPattern = /^[a-z0-9][a-z0-9:._-]{2,299}$/i
const redirectKeyPattern = /^R9-[0-9a-f]{24}$/

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value))
const stringValue = (value: unknown, maximum = 500) => typeof value === 'string' && value.length <= maximum ? value : null
const booleanValue = (value: unknown) => typeof value === 'boolean' ? value : null

const rpcCode = (error: Pick<PostgrestError, 'message'> | null) => {
  const message = error?.message ?? ''
  return [
    'AUTH_REQUIRED', 'ADMIN_REQUIRED', 'REVIEW_NOT_FOUND', 'TARGET_NOT_FOUND', 'REDIRECT_NOT_FOUND',
    'BATCH_NOT_FOUND', 'VALIDATION_ERROR', 'BASELINE_MISMATCH', 'RECONCILIATION_MISMATCH',
    'PROVENANCE_MISMATCH', 'TARGET_BASELINE_MISMATCH', 'BOOTSTRAP_CONFLICT',
    'BOOTSTRAP_RECONCILIATION_FAILED', 'ASSET_RECONCILIATION_FAILED', 'ASSET_HASH_INVALID',
    'UNEXPECTED_TARGET_ASSET', 'TARGET_VERSION_CONFLICT',
    'DECISION_EVIDENCE_REQUIRED', 'PUBLISH_CHECKLIST_INCOMPLETE', 'REDACTION_REQUIRED',
    'PUBLIC_TARGET_EVIDENCE_REQUIRED', 'INVALID_DECISION', 'INVALID_HTTP_EVIDENCE',
    'INVALID_DERIVATIVE', 'DERIVATIVE_NOT_REQUIRED', 'ORIGINAL_MISMATCH', 'ACTIVE_DERIVATIVE_EXISTS',
    'BACKUP_EVIDENCE_REQUIRED', 'CHECKPOINT_CONFLICT', 'BATCH_KEY_CONFLICT',
    'TARGET_SET_MISMATCH', 'REVIEW_NOT_RESOLVED', 'TARGET_STATUS_CONFLICT',
    'BATCH_NOT_APPLICABLE', 'BATCH_RECONCILIATION_FAILED', 'ROLLBACK_NOT_ALLOWED',
    'ROLLBACK_TARGET_CONFLICT', 'UTILITY_ROUTE_MUST_ARCHIVE', 'AUDIT_APPEND_ONLY',
    'DRY_RUN_CANNOT_APPLY', 'UNSUPPORTED_TARGET_KIND', 'DERIVATIVE_OBJECT_NOT_FOUND',
    'INVALID_DERIVATIVE_PATH', 'CONTENT_NOT_PUBLISHABLE', 'MANAGED_TARGET_DELETE_FORBIDDEN',
    'MANAGED_TARGET_MUST_BE_UNPUBLISHED', 'MANAGED_TARGET_RELEASE_REQUIRED', 'ORIGINAL_ASSET_IMMUTABLE'
  ].find((code) => message.includes(code)) ?? 'INTERNAL_ERROR'
}

export const throwEditorialRpcError = (error: PostgrestError | null) => {
  if (!error) return
  const code = rpcCode(error) as ApiErrorCode
  if (code === 'AUTH_REQUIRED') throw apiError(401, code, 'Authentication is required.')
  if (code === 'ADMIN_REQUIRED') throw apiError(403, code, 'Administrator access is required.')
  if (code.endsWith('_NOT_FOUND')) throw apiError(404, code, 'The requested editorial record was not found.')
  if (['TARGET_VERSION_CONFLICT', 'BOOTSTRAP_CONFLICT', 'ACTIVE_DERIVATIVE_EXISTS', 'CHECKPOINT_CONFLICT', 'BATCH_KEY_CONFLICT', 'ROLLBACK_TARGET_CONFLICT',
    'MANAGED_TARGET_DELETE_FORBIDDEN', 'MANAGED_TARGET_MUST_BE_UNPUBLISHED', 'MANAGED_TARGET_RELEASE_REQUIRED', 'ORIGINAL_ASSET_IMMUTABLE'].includes(code)) {
    throw apiError(409, code, 'The record changed or conflicts with existing evidence. Refresh and retry.')
  }
  if (['BACKUP_EVIDENCE_REQUIRED', 'PUBLIC_TARGET_EVIDENCE_REQUIRED', 'REDACTION_REQUIRED', 'PUBLISH_CHECKLIST_INCOMPLETE', 'REVIEW_NOT_RESOLVED'].includes(code)) {
    throw apiError(409, code, 'Required release evidence is incomplete.')
  }
  if (code !== 'INTERNAL_ERROR') throw apiError(400, code, 'The editorial operation failed validation.')
  throw internalApiError()
}

export const isPhase10RpcUnavailable = (error: PostgrestError | null) => Boolean(
  error?.code === 'PGRST202' && /phase10_[a-z0-9_]+/i.test(error.message)
)

export const requirePhase10TargetDeleteAllowed = async (
  supabase: SupabaseClient,
  targetKind: 'activity' | 'file' | 'year-summary',
  targetId: string
) => {
  const { error } = await supabase.rpc('phase10_assert_target_delete_allowed', {
    p_target_kind: targetKind,
    p_target_id: targetId
  })
  if (isPhase10RpcUnavailable(error)) return
  throwEditorialRpcError(error)
}

export const requirePhase10ActivityAssetDeleteAllowed = async (supabase: SupabaseClient, assetId: string) => {
  const { error } = await supabase.rpc('phase10_assert_activity_asset_delete_allowed', { p_asset_id: assetId })
  if (isPhase10RpcUnavailable(error)) return
  throwEditorialRpcError(error)
}

const camelKey = (key: string) => key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())

export const camelizeEditorial = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(camelizeEditorial)
  if (!isRecord(value)) return value
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [camelKey(key), camelizeEditorial(item)]))
}

export const requireEditorialReviewKey = (value: string | undefined) => {
  if (!value || !reviewKeyPattern.test(value)) throw apiError(404, 'REVIEW_NOT_FOUND', 'Editorial review not found.')
  return value
}

export const requireEditorialRedirectKey = (value: string | undefined) => {
  const decoded = value ? decodeURIComponent(value) : ''
  if (!redirectKeyPattern.test(decoded)) throw apiError(404, 'REDIRECT_NOT_FOUND', 'Redirect not found.')
  return decoded
}

export const requireReleaseBatchKey = (value: string | undefined) => {
  if (!value || !batchKeyPattern.test(value)) throw apiError(404, 'BATCH_NOT_FOUND', 'Release batch not found.')
  return value
}

export const parseEditorialFilters = (query: Record<string, unknown>) => {
  const state = stringValue(query.state, 20) ?? 'all'
  const severity = stringValue(query.severity, 20) ?? 'all'
  const targetKind = stringValue(query.targetKind, 30) ?? 'all'
  const search = (stringValue(query.q, 200) ?? '').trim()
  const limit = query.limit === undefined ? 50 : Number(query.limit)
  const offset = query.offset === undefined ? 0 : Number(query.offset)
  if (!['all', 'pending', 'in-review', 'resolved', 'deferred'].includes(state)
    || !['all', 'high', 'medium', 'low'].includes(severity)
    || !['all', 'activity', 'file', 'year-summary', 'redirect'].includes(targetKind)
    || !Number.isInteger(limit) || limit < 1 || limit > 100
    || !Number.isInteger(offset) || offset < 0) {
    throw apiError(400, 'VALIDATION_ERROR', 'Invalid editorial queue filter.')
  }
  return { state, severity, targetKind, search, limit, offset }
}

export const parseEditorialReviewUpdate = (body: unknown): EditorialReviewUpdateInput => {
  if (!isRecord(body)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid editorial review update.')
  const state = stringValue(body.state, 20) as EditorialState | null
  const rawDecision = body.decision === null ? null : stringValue(body.decision, 30)
  const decision = rawDecision as EditorialDecision | null
  const decisionReason = stringValue(body.decisionReason, 4000)
  const contentVerified = booleanValue(body.contentVerified)
  const privacyVerified = booleanValue(body.privacyVerified)
  const authorizationVerified = booleanValue(body.authorizationVerified)
  const publicTargetVerified = booleanValue(body.publicTargetVerified)
  const targetVersion = stringValue(body.targetVersion, 100)
  if (!state || !['pending', 'in-review', 'resolved', 'deferred'].includes(state)
    || (decision !== null && !['publish', 'keep-draft', 'archive', 'activate-redirect', 'keep-inactive'].includes(decision))
    || decisionReason === null || contentVerified === null || privacyVerified === null
    || authorizationVerified === null || publicTargetVerified === null || !targetVersion) {
    throw apiError(400, 'VALIDATION_ERROR', 'Invalid editorial review update.')
  }
  return { state, decision, decisionReason: decisionReason.trim(), contentVerified, privacyVerified, authorizationVerified, publicTargetVerified, targetVersion }
}

export const parseEditorialBootstrap = (body: unknown) => {
  if (!isRecord(body) || !sha256Pattern.test(String(body.sourceSnapshotSha256 ?? ''))
    || !sha256Pattern.test(String(body.manifestSha256 ?? ''))
    || !Array.isArray(body.targets) || body.targets.length !== 70
    || !Array.isArray(body.redirects) || body.redirects.length !== 83
    || !Array.isArray(body.reviews) || body.reviews.length !== 122
    || JSON.stringify(body).length > 3_000_000) {
    throw apiError(400, 'RECONCILIATION_MISMATCH', 'Editorial bootstrap evidence is incomplete.')
  }
  return {
    sourceSnapshotSha256: String(body.sourceSnapshotSha256),
    manifestSha256: String(body.manifestSha256),
    targets: body.targets,
    redirects: body.redirects,
    reviews: body.reviews
  }
}

export const parseRedirectVerification = (body: unknown) => {
  if (!isRecord(body)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid redirect verification evidence.')
  const verifiedOrigin = stringValue(body.verifiedOrigin, 300)
  const targetVersion = stringValue(body.targetVersion, 200)
  try {
    if (!verifiedOrigin || new URL(verifiedOrigin).protocol !== 'https:' || new URL(verifiedOrigin).pathname !== '/'
      || new URL(verifiedOrigin).search || new URL(verifiedOrigin).hash || !targetVersion) throw new Error()
  } catch {
    throw apiError(400, 'INVALID_HTTP_EVIDENCE', 'Redirect verification requires an approved HTTPS origin and target version.')
  }
  return { verifiedOrigin: new URL(verifiedOrigin).origin, targetVersion }
}

export const parseRedirectDecision = (body: unknown) => {
  if (!isRecord(body)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid redirect decision.')
  const decision = stringValue(body.decision, 20)
  const decisionReason = stringValue(body.decisionReason, 4000)?.trim()
  if (!decision || !['pending', 'activate', 'keep-inactive', 'archive'].includes(decision)
    || (decision !== 'pending' && !decisionReason)) {
    throw apiError(400, 'VALIDATION_ERROR', 'A redirect decision and reason are required.')
  }
  return { decision, decisionReason: decisionReason ?? '' }
}

export const parseReleasePlan = (body: unknown) => {
  if (!isRecord(body)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid release plan.')
  const batchKey = stringValue(body.batchKey, 100)
  const manifestSha256 = stringValue(body.manifestSha256, 64)
  const mode = stringValue(body.mode, 20)
  const safetyCheckpointKey = body.safetyCheckpointKey === null ? null : stringValue(body.safetyCheckpointKey, 100)
  const items = Array.isArray(body.items) ? body.items : []
  const validItems = items.every((item) => {
    if (!isRecord(item)) return false
    const reviewKeys = Array.isArray(item.reviewKeys) ? item.reviewKeys : []
    const redirectKeys = Array.isArray(item.redirectKeys) ? item.redirectKeys : []
    return typeof item.sourceKey === 'string' && sourceKeyPattern.test(item.sourceKey)
      && typeof item.targetId === 'string' && uuidPattern.test(item.targetId)
      && typeof item.targetKind === 'string' && ['activity', 'file', 'year-summary'].includes(item.targetKind)
      && typeof item.expectedTargetVersion === 'string' && item.expectedTargetVersion.length > 0 && item.expectedTargetVersion.length <= 200
      && reviewKeys.length >= 1 && new Set(reviewKeys).size === reviewKeys.length
      && reviewKeys.every((key) => typeof key === 'string' && reviewKeyPattern.test(key))
      && redirectKeys.length <= 52 && new Set(redirectKeys).size === redirectKeys.length
      && redirectKeys.every((key) => typeof key === 'string' && redirectKeyPattern.test(key))
  })
  const sourceKeys = items.map((item) => isRecord(item) ? item.sourceKey : null)
  const reviewKeys = items.flatMap((item) => isRecord(item) && Array.isArray(item.reviewKeys) ? item.reviewKeys : [])
  const redirectKeys = items.flatMap((item) => isRecord(item) && Array.isArray(item.redirectKeys) ? item.redirectKeys : [])
  if (!batchKey || !batchKeyPattern.test(batchKey) || !manifestSha256 || !sha256Pattern.test(manifestSha256)
    || !mode || !['dry-run', 'apply'].includes(mode) || items.length < 1 || items.length > 70 || !validItems
    || new Set(sourceKeys).size !== sourceKeys.length
    || new Set(reviewKeys).size !== reviewKeys.length || new Set(redirectKeys).size !== redirectKeys.length
    || (mode === 'apply' && (!safetyCheckpointKey || !batchKeyPattern.test(safetyCheckpointKey)))) {
    throw apiError(400, 'VALIDATION_ERROR', 'Invalid release plan.')
  }
  return { batchKey, manifestSha256, mode, safetyCheckpointKey, sourceKeys: sourceKeys as string[], items }
}

export const parseBatchApply = (body: unknown) => {
  if (!isRecord(body) || typeof body.checkpointToken !== 'string' || !uuidPattern.test(body.checkpointToken)) {
    throw apiError(400, 'VALIDATION_ERROR', 'A valid checkpoint token is required.')
  }
  const maxItems = body.maxItems === undefined ? 10 : Number(body.maxItems)
  if (!Number.isInteger(maxItems) || maxItems < 1 || maxItems > 25) throw apiError(400, 'VALIDATION_ERROR', 'Invalid batch size.')
  return { checkpointToken: body.checkpointToken, maxItems }
}

export const parseBatchRollback = (body: unknown) => {
  if (!isRecord(body) || typeof body.checkpointToken !== 'string' || !uuidPattern.test(body.checkpointToken)) {
    throw apiError(400, 'VALIDATION_ERROR', 'A valid checkpoint token is required.')
  }
  return { checkpointToken: body.checkpointToken }
}

export const parseSafetyCheckpoint = (body: unknown) => {
  if (!isRecord(body)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid safety checkpoint.')
  const checkpointKey = stringValue(body.checkpointKey, 100)
  const environment = stringValue(body.environment, 20)
  const databaseBackupId = stringValue(body.databaseBackupId, 500)?.trim()
  const databaseEvidenceSha256 = stringValue(body.databaseEvidenceSha256, 64)
  const storageInventorySha256 = stringValue(body.storageInventorySha256, 64)
  const restoreEvidenceSha256 = stringValue(body.restoreEvidenceSha256, 64)
  const restoreRehearsedAt = stringValue(body.restoreRehearsedAt, 100)
  if (!checkpointKey || !batchKeyPattern.test(checkpointKey) || !['staging', 'production'].includes(environment ?? '')
    || !databaseBackupId || !databaseEvidenceSha256 || !sha256Pattern.test(databaseEvidenceSha256)
    || !storageInventorySha256 || !sha256Pattern.test(storageInventorySha256)
    || !restoreEvidenceSha256 || !sha256Pattern.test(restoreEvidenceSha256)
    || !restoreRehearsedAt || Number.isNaN(Date.parse(restoreRehearsedAt)) || Date.parse(restoreRehearsedAt) > Date.now()) {
    throw apiError(400, 'BACKUP_EVIDENCE_REQUIRED', 'A verified backup and restore rehearsal are required.')
  }
  return { checkpointKey, environment, databaseBackupId, databaseEvidenceSha256, storageInventorySha256, restoreEvidenceSha256, restoreRehearsedAt }
}

export const parseDerivativeAssetId = (value: unknown) => {
  if (typeof value !== 'string' || !uuidPattern.test(value)) throw apiError(400, 'VALIDATION_ERROR', 'A valid asset is required.')
  return value
}

export const editorialEnumValues = {
  states: ['pending', 'in-review', 'resolved', 'deferred'] as readonly EditorialState[],
  severities: ['high', 'medium', 'low'] as readonly EditorialSeverity[],
  targetKinds: ['activity', 'file', 'year-summary', 'redirect'] as readonly EditorialTargetKind[]
}
