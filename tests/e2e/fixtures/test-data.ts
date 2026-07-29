export const stagingBaseUrl = process.env.PHASE12_STAGING_BASE_URL?.trim() || ''
export const isStaging = Boolean(stagingBaseUrl)
export const runId = (process.env.PHASE12_E2E_RUN_ID || `${Date.now()}`).replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40)
export const fixturePrefix = `e2e-phase12-${runId}`
export const seededAssetId = process.env.PHASE12_SEEDED_ASSET_ID || ''

export const adminCredentials = {
  email: process.env.PHASE12_ADMIN_EMAIL || '',
  password: process.env.PHASE12_ADMIN_PASSWORD || ''
}

export const nonAdminCredentials = {
  email: process.env.PHASE12_NON_ADMIN_EMAIL || '',
  password: process.env.PHASE12_NON_ADMIN_PASSWORD || ''
}

export const requireCredentials = (kind: 'admin' | 'non-admin') => {
  const credentials = kind === 'admin' ? adminCredentials : nonAdminCredentials
  if (!credentials.email || !credentials.password) {
    throw new Error(`Missing Phase 12 ${kind} staging credentials.`)
  }
  return credentials
}
