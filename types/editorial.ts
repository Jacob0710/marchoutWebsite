export type EditorialSeverity = 'high' | 'medium' | 'low'
export type EditorialState = 'pending' | 'in-review' | 'resolved' | 'deferred'
export type EditorialTargetKind = 'activity' | 'file' | 'year-summary' | 'redirect'
export type EditorialDecision = 'publish' | 'keep-draft' | 'archive' | 'activate-redirect' | 'keep-inactive'
export type EditorialPrivacyState = 'unknown' | 'cleared' | 'redaction-required' | 'redacted' | 'not-applicable'

export interface EditorialReviewListItem {
  reviewKey: string
  severity: EditorialSeverity
  targetKind: EditorialTargetKind
  sourceKey: string
  issueCode: string
  state: EditorialState
  decision: EditorialDecision | null
  decisionReason: string | null
  targetId: string | null
  targetTitle: string
  targetStatus: string
  privacyState: EditorialPrivacyState
  updatedAt: string
}

export interface EditorialQueueResponse {
  items: EditorialReviewListItem[]
  total: number
  reconciliation: EditorialReconciliation
}

export interface EditorialTarget {
  id: string
  sourceKey: string
  sourceSha256: string
  normalizedSha256: string
  targetKind: Exclude<EditorialTargetKind, 'redirect'>
  targetId: string
  targetNaturalKey: string
  originalStatus: 'draft'
  decision: 'pending' | 'publish' | 'keep-draft' | 'archive'
  decisionReason: string | null
  contentVerified: boolean
  privacyVerified: boolean
  authorizationVerified: boolean
  targetVersion: string
  decidedAt: string | null
  updatedAt: string
}

export interface EditorialRedirect {
  id: string
  redirectKey: string
  sourceKey: string
  sourceUrl: string
  sourcePath: string
  targetPath: string | null
  phase9StatusCode: 0 | 301
  phase9Disposition: 'structural-candidate' | 'draft-target' | 'utility-archive'
  decision: 'pending' | 'activate' | 'keep-inactive' | 'archive'
  decisionReason: string | null
  targetVersion: string | null
  targetVerified: boolean
  verifiedOrigin: string | null
  verifiedFinalUrl: string | null
  verifiedFinalStatus: number | null
  verifiedHops: number | null
  verifiedAt: string | null
  decidedAt: string | null
}

export interface EditorialAsset {
  id: string
  assetKind: 'activity-asset' | 'file'
  kind: string
  originalName: string
  mimeType: string
  sizeBytes: number
  privacyState: Exclude<EditorialPrivacyState, 'not-applicable'>
  hasDerivative: boolean
}

export interface EditorialDerivative {
  id: string
  editorialTargetId: string
  assetKind: 'activity-asset' | 'file'
  assetId: string
  originalBucket: string
  originalPath: string
  originalSha256: string
  derivativeBucket: string
  derivativePath: string
  derivativeSha256: string
  derivativeMimeType: string
  derivativeOriginalName: string
  derivativeSizeBytes: number
  redactionMethod: string
  inspectionSummary: Record<string, boolean>
  status: 'active' | 'revoked'
  createdAt: string
  revokedAt: string | null
}

export interface EditorialReviewDetail {
  review: {
    id: string
    reviewKey: string
    sourceKey: string
    sourceUrl: string | null
    targetKind: EditorialTargetKind
    severity: EditorialSeverity
    issueCode: string
    description: string
    recommendedAction: string
    phase9Resolution: string
    state: EditorialState
    decision: EditorialDecision | null
    decisionReason: string | null
    contentVerified: boolean
    privacyVerified: boolean
    authorizationVerified: boolean
    publicTargetVerified: boolean
    targetVersion: string | null
    decidedAt: string | null
    updatedAt: string
  }
  target: EditorialTarget | null
  redirect: EditorialRedirect | null
  assets: EditorialAsset[]
  derivatives: EditorialDerivative[]
  audit: Array<{
    id: number
    action: string
    correlationId: string
    beforeState: Record<string, unknown>
    afterState: Record<string, unknown>
    createdAt: string
  }>
}

export interface EditorialReviewUpdateInput {
  state: EditorialState
  decision: EditorialDecision | null
  decisionReason: string
  contentVerified: boolean
  privacyVerified: boolean
  authorizationVerified: boolean
  publicTargetVerified: boolean
  targetVersion: string
}

export interface EditorialReconciliation {
  targets: { total: number; pending: number; publish: number; keepDraft: number; archive: number }
  reviews: { total: number; pending: number; inReview: number; resolved: number; deferred: number; highRemaining: number }
  redirects: { total: number; activate: number; keepInactive: number; archive: number; pending: number; verified: number }
  derivatives: { active: number; unredactedRequired: number }
  auditRows: number
}

export interface ReleaseBatchResult {
  id?: string
  batchKey: string
  mode?: 'dry-run' | 'apply'
  status: string
  totalItems?: number
  processed?: number
  remaining?: number
  nextPosition?: number
  failedPosition?: number
  errorCode?: string
  eligible?: number
  blocked?: number
  stale?: number
  alreadyPublished?: number
  checkpointToken?: string
  idempotent?: boolean
}
