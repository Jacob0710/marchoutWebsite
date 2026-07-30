import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'codexSteps/phase12.md',
  'outputs/phase-12-execution-status.md',
  'playwright.config.ts',
  'tests/e2e/public-navigation.spec.ts',
  'tests/e2e/public-activities.spec.ts',
  'tests/e2e/public-files.spec.ts',
  'tests/e2e/auth-boundaries.spec.ts',
  'tests/e2e/admin-login.spec.ts',
  'tests/e2e/admin-activity-readonly.spec.ts',
  'tests/e2e/admin-activity-crud.spec.ts',
  'tests/e2e/admin-assets.spec.ts',
  'tests/e2e/security-browser-contract.spec.ts',
  'tests/e2e/accessibility-smoke.spec.ts',
  'scripts/phase12/seed-e2e-fixtures.mjs',
  'scripts/phase12/cleanup-e2e-fixtures.mjs',
  'scripts/phase12/verify-staging-approval.mjs',
  'scripts/phase12/verify-staging-origin.mjs',
  'scripts/phase12/staging-browser-smoke.mjs',
  'scripts/phase12/scan-e2e-artifacts.mjs',
  'scripts/phase12/verify-release-evidence.mjs',
  'scripts/phase12/production-post-release-smoke.mjs',
  'scripts/phase12/production-auth-readonly-smoke.mjs',
  '.github/workflows/phase12-quality.yml',
  '.github/workflows/phase12-staging-e2e.yml',
  '.github/workflows/phase12-production-release.yml'
]
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Missing required Phase 12 file: ${file}`)
}

const expectedMigrations = [
  '20260713000100_phase4_public_schema_baseline.sql',
  '20260714000100_admin_users.sql',
  '20260714000200_admin_activity_read_policy.sql',
  '20260715000100_phase6_activity_crud_assets.sql',
  '20260716000100_phase7_admin_access_governance.sql',
  '20260720000100_phase8_core_content_platform.sql',
  '20260721000100_phase9_content_migration_provenance.sql',
  '20260721000200_phase9_publish_timestamp_consistency.sql',
  '20260722000100_phase10_editorial_review_queue.sql',
  '20260722000200_phase10_release_batches.sql',
  '20260722000300_phase10_redirect_review_hotfix.sql'
]
const actualMigrations = fs.readdirSync(path.join(root, 'supabase/migrations'))
  .filter(file => file.endsWith('.sql'))
  .sort()
if (JSON.stringify(actualMigrations) !== JSON.stringify(expectedMigrations)) {
  throw new Error(`Unexpected Supabase migration chain: ${actualMigrations.join(', ')}`)
}
const versions = actualMigrations.map(file => file.slice(0, 14))
if (new Set(versions).size !== versions.length || versions.some(version => !/^\d{14}$/.test(version))) {
  throw new Error('Supabase migration versions must be unique 14-digit timestamps.')
}
const baseline = fs.readFileSync(path.join(root, 'supabase/migrations', expectedMigrations[0]), 'utf8')
for (const table of ['activities', 'activity_images', 'posts', 'files', 'categories', 'faq', 'site_settings']) {
  if (!new RegExp(`create table if not exists (?:public\\.)?${table}\\b`, 'i').test(baseline)) {
    throw new Error(`Phase 4 baseline is missing table: ${table}`)
  }
}
if (/^\s*(?:update|delete|truncate)\b/im.test(baseline)
  || /^\s*insert\s+into\s+(?!storage\.buckets\b)/im.test(baseline)
  || /\b(?:service[_-]?role|postgres(?:ql)?:\/\/)\b/i.test(baseline)) {
  throw new Error('Phase 4 baseline contains content mutation or credential material.')
}

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
if (packageJson.packageManager !== 'pnpm@11.9.0') throw new Error('pnpm package-manager contract changed.')
for (const script of ['test:e2e', 'test:e2e:chromium', 'test:e2e:staging', 'phase12:verify', 'phase12:verify-staging-approval', 'phase12:verify-staging', 'phase12:seed', 'phase12:cleanup', 'phase12:staging-result', 'phase12:verify-release', 'phase12:production-smoke', 'phase12:production-auth-smoke']) {
  if (!packageJson.scripts?.[script]) throw new Error(`Missing Phase 12 script: ${script}`)
}

const candidates = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
const forbidden = /^(?:playwright\/\.auth|playwright-report|test-results|coverage|node_modules|\.nuxt|\.output|\.phase12-cache)(?:\/|$)|^\.env(?:\.|$)/i
const forbiddenArtifacts = candidates.filter(file => forbidden.test(file) && file !== '.env.example')
if (forbiddenArtifacts.length) throw new Error(`Forbidden Phase 12 artifacts: ${forbiddenArtifacts.join(', ')}`)

const workflows = required.filter(file => file.startsWith('.github/workflows/'))
let actionReferences = 0
for (const workflow of workflows) {
  const source = fs.readFileSync(path.join(root, workflow), 'utf8')
  if (/pull_request_target|\bwrite-all\b/.test(source)) throw new Error(`Unsafe workflow trigger or permission in ${workflow}`)
  if (!/^permissions:\s*\r?\n\s+contents:\s+read/m.test(source)) throw new Error(`Missing least-privilege top-level permission in ${workflow}`)
  for (const match of source.matchAll(/uses:\s*([^\s#]+)/g)) {
    const reference = match[1]
    if (reference.startsWith('./')) continue
    actionReferences += 1
    if (!/@[0-9a-f]{40}$/i.test(reference)) throw new Error(`Mutable action reference in ${workflow}: ${reference}`)
  }
}

const qualityWorkflow = fs.readFileSync(path.join(root, '.github/workflows/phase12-quality.yml'), 'utf8')
if (/\$\{\{\s*secrets\./.test(qualityWorkflow)) throw new Error('Phase 12 PR quality workflow must not reference secrets.')
if (!/push:\s*\r?\n\s+branches:\s*\[main\]/.test(qualityWorkflow)) throw new Error('Phase 12 quality workflow must validate final main commits.')
const stagingWorkflow = fs.readFileSync(path.join(root, '.github/workflows/phase12-staging-e2e.yml'), 'utf8')
if (!/environment:\s*staging/.test(stagingWorkflow)) throw new Error('Staging workflow lacks its protected environment.')
if (/PRODUCTION_ADMIN_(?:EMAIL|PASSWORD)/.test(stagingWorkflow)) throw new Error('Staging workflow has cross-environment credentials.')
if (!/verify-staging-approval\.mjs/.test(stagingWorkflow)) throw new Error('Staging workflow lacks verifiable owner approval.')
if (!/needs\.seed\.result != 'skipped'/.test(stagingWorkflow)) throw new Error('Staging cleanup is not fail-safe after a partial seed.')
const browserJob = stagingWorkflow.match(/\n {2}browser-e2e:[\s\S]*?(?=\n {2}[a-z][a-z0-9-]+:|\s*$)/)?.[0] || ''
if (/SERVICE_ROLE/.test(browserJob)) throw new Error('Staging browser job must not receive the service role.')
const crossBrowserSecurity = fs.readFileSync(path.join(root, 'tests/e2e/security-browser-contract.spec.ts'), 'utf8')
if (/test\.info\(\)\.project\.name\s*!==/.test(crossBrowserSecurity)) {
  throw new Error('The staging security contract must run in every configured browser project without project-specific skips.')
}
const productionWorkflow = fs.readFileSync(path.join(root, '.github/workflows/phase12-production-release.yml'), 'utf8')
if (!/environment:\s*production/.test(productionWorkflow)) throw new Error('Production workflow lacks its protected environment.')
if (/PHASE12_(?:ADMIN|NON_ADMIN)_(?:EMAIL|PASSWORD)/.test(productionWorkflow)) throw new Error('Production workflow references staging identities.')
const legacyWorkflow = fs.readFileSync(path.join(root, '.github/workflows/phase11-quality.yml'), 'utf8')
if (/protected-release-gate|PHASE10_ADMIN_(?:EMAIL|PASSWORD)/.test(legacyWorkflow)) {
  throw new Error('Legacy production-origin authenticated release gate was not retired.')
}

const secretPatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[opsu]_[A-Za-z0-9_]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /postgres(?:ql)?:\/\/[^/\s:@]+:[^@\s/]+@/i
]
const secretFindings = []
for (const file of candidates) {
  const fullPath = path.join(root, file)
  if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size > 2_000_000) continue
  const source = fs.readFileSync(fullPath, 'utf8')
  if (secretPatterns.some(pattern => pattern.test(source))) secretFindings.push(file)
}
if (secretFindings.length) throw new Error(`Secret signatures detected: ${secretFindings.join(', ')}`)

console.log(JSON.stringify({
  status: 'ok',
  candidates: candidates.length,
  requiredFiles: required.length,
  migrations: actualMigrations.length,
  migrationVersionsUnique: true,
  baselineTables: 7,
  baselineContentRows: 0,
  actionReferences,
  trackedPlaywrightAuthStates: 0,
  forbiddenTrackedArtifacts: 0,
  secretFindings: 0,
  productionMutationScripts: 0
}, null, 2))
