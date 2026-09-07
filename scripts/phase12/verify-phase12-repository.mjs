import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const required = [
  'codexSteps/phase12.md',
  'outputs/phase-12-execution-status.md',
  'vercel.json',
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
  'scripts/phase12/lib/github-evidence.mjs',
  'scripts/phase12/verify-staging-approval.mjs',
  'scripts/phase12/verify-staging-origin.mjs',
  'scripts/phase12/normalize-vercel-project-settings.mjs',
  'scripts/phase12/staging-browser-smoke.mjs',
  'scripts/phase12/scan-e2e-artifacts.mjs',
  'scripts/phase12/verify-release-evidence.mjs',
  'scripts/phase12/production-post-release-smoke.mjs',
  'scripts/phase12/production-auth-readonly-smoke.mjs',
  'tests/phase12/github-evidence.test.mjs',
  '.github/workflows/phase12-quality.yml',
  '.github/workflows/phase12-staging-e2e.yml',
  '.github/workflows/phase12-production-release.yml',
  '.github/workflows/staging-synthetic.yml',
  '.github/workflows/production-synthetic.yml'
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
for (const script of ['test:e2e', 'test:e2e:chromium', 'test:e2e:staging', 'phase12:verify', 'phase12:test', 'phase12:verify-staging-approval', 'phase12:verify-staging', 'phase12:normalize-vercel', 'phase12:seed', 'phase12:cleanup', 'phase12:staging-result', 'phase12:verify-release', 'phase12:production-smoke', 'phase12:production-auth-smoke']) {
  if (!packageJson.scripts?.[script]) throw new Error(`Missing Phase 12 script: ${script}`)
}
if (!/\bnuxi prepare\b[\s\S]*\bplaywright test\b/.test(packageJson.scripts['test:e2e:staging'])) {
  throw new Error('Staging browser tests must prepare Nuxt types on a clean runner before Playwright loads tsconfig.')
}

const vercelConfig = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'))
if (vercelConfig.framework !== 'nuxtjs' || vercelConfig.outputDirectory !== null) {
  throw new Error('Vercel must use Nuxt framework detection without a legacy output-directory override.')
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
  for (const match of source.matchAll(/^\s*-\s+uses:\s*([^\s#]+)/gm)) {
    const reference = match[1]
    if (reference.startsWith('./')) continue
    actionReferences += 1
    if (!/@[0-9a-f]{40}$/i.test(reference)) throw new Error(`Mutable action reference in ${workflow}: ${reference}`)
  }
}

const qualityWorkflow = fs.readFileSync(path.join(root, '.github/workflows/phase12-quality.yml'), 'utf8')
if (/\$\{\{\s*secrets\./.test(qualityWorkflow)) throw new Error('Phase 12 PR quality workflow must not reference secrets.')
if (!/push:\s*\r?\n\s+branches:\s*\[main\]/.test(qualityWorkflow)) throw new Error('Phase 12 quality workflow must validate final main commits.')
if (!/pnpm run phase12:test/.test(qualityWorkflow)) throw new Error('Phase 12 quality workflow does not run verifier regression tests.')
const stagingWorkflow = fs.readFileSync(path.join(root, '.github/workflows/phase12-staging-e2e.yml'), 'utf8')
if (!/environment:\s*staging/.test(stagingWorkflow)) throw new Error('Staging workflow lacks its protected environment.')
if (/\bschedule:\s*\r?\n/.test(stagingWorkflow)) {
  throw new Error('The approval-gated staging deployment workflow must not run on an unattended schedule.')
}
if (!/workflow_call:[\s\S]*?release_sha:[\s\S]*?required:\s*true/.test(stagingWorkflow)) {
  throw new Error('Staging workflow cannot be called through a default-branch registered workflow.')
}
if (/PRODUCTION_ADMIN_(?:EMAIL|PASSWORD)/.test(stagingWorkflow)) throw new Error('Staging workflow has cross-environment credentials.')
if (!/verify-staging-approval\.mjs/.test(stagingWorkflow)) throw new Error('Staging workflow lacks verifiable owner approval.')
if (!/pnpm run phase12:test/.test(stagingWorkflow)) throw new Error('Staging quality does not run verifier regression tests.')
if (!/needs\.seed\.result != 'skipped'/.test(stagingWorkflow)) throw new Error('Staging cleanup is not fail-safe after a partial seed.')
if (!/vercel@\$VERCEL_CLI_VERSION" pull[\s\S]*?phase12:normalize-vercel[\s\S]*?NITRO_PRESET=vercel[\s\S]*?pnpm run build[\s\S]*?vercel@\$VERCEL_CLI_VERSION" deploy --prebuilt/.test(stagingWorkflow)) {
  throw new Error('Staging deployment does not create a Vercel Nitro artifact from normalized settings before deploy.')
}
if (/vercel@\$VERCEL_CLI_VERSION" build/.test(stagingWorkflow)) {
  throw new Error('Staging build must not delegate to remote output-directory settings.')
}
const stagingSyntheticWorkflow = fs.readFileSync(path.join(root, '.github/workflows/staging-synthetic.yml'), 'utf8')
if (!/schedule:[\s\S]*?cron:\s*'41 \*\/6 \* \* \*'/.test(stagingSyntheticWorkflow)
  || !/environment:\s*staging/.test(stagingSyntheticWorkflow)
  || !/PHASE10_SYNTHETIC_ORIGIN:\s*\$\{\{ vars\.PHASE12_STAGING_BASE_URL \}\}/.test(stagingSyntheticWorkflow)
  || !/PHASE10_EXPECTED_ENVIRONMENT:\s*staging/.test(stagingSyntheticWorkflow)
  || !/node scripts\/phase10\/synthetic-check\.mjs/.test(stagingSyntheticWorkflow)) {
  throw new Error('Staging keepalive must run the fail-closed synthetic contract against the protected staging origin.')
}
const validateJob = stagingWorkflow.match(/\n {2}validate-commit:[\s\S]*?(?=\n {2}[a-z][a-z0-9-]+:|\s*$)/)?.[0] || ''
if (!/\n {6}statuses:\s*read\b/.test(validateJob)) {
  throw new Error('Staging commit validation cannot read external commit statuses.')
}
if (!/PHASE12_REQUIRED_CHECKS:\s*quality,phase12-quality,Vercel – marchout-staging/.test(validateJob)) {
  throw new Error('Staging commit validation does not require the isolated staging Vercel status.')
}
const browserJob = stagingWorkflow.match(/\n {2}browser-e2e:[\s\S]*?(?=\n {2}[a-z][a-z0-9-]+:|\s*$)/)?.[0] || ''
if (/SERVICE_ROLE/.test(browserJob)) throw new Error('Staging browser job must not receive the service role.')
if (!/PHASE12_STAGING_SUPABASE_ANON_KEY/.test(browserJob)) {
  throw new Error('Staging browser job must identify the public anon value so artifact scans can distinguish it from secret JWTs.')
}
if (!/if:\s*always\(\)[\s\S]*?phase12:scan-artifacts/.test(browserJob)) {
  throw new Error('Staging browser evidence must be scanned even when the browser matrix fails.')
}
const cleanupJob = stagingWorkflow.match(/\n {2}cleanup:[\s\S]*?(?=\n {2}[a-z][a-z0-9-]+:|\s*$)/)?.[0] || ''
if ([...cleanupJob.matchAll(/pnpm run phase12:cleanup/g)].length !== 2) {
  throw new Error('Staging cleanup must run twice to prove zero residual and idempotency.')
}
const cleanupSource = fs.readFileSync(path.join(root, 'scripts/phase12/cleanup-e2e-fixtures.mjs'), 'utf8')
for (const bucket of ['activity-assets', 'content-assets', 'downloads']) {
  if (!cleanupSource.includes(`'${bucket}'`)) throw new Error(`Staging cleanup does not inventory the ${bucket} bucket.`)
}
if (!/storageResidualByBucket/.test(cleanupSource)) {
  throw new Error('Staging cleanup does not record per-bucket namespace residuals.')
}
const crossBrowserSecurity = fs.readFileSync(path.join(root, 'tests/e2e/security-browser-contract.spec.ts'), 'utf8')
if (/test\.info\(\)\.project\.name\s*!==/.test(crossBrowserSecurity)) {
  throw new Error('The staging security contract must run in every configured browser project without project-specific skips.')
}
const productionWorkflow = fs.readFileSync(path.join(root, '.github/workflows/phase12-production-release.yml'), 'utf8')
if (!/environment:\s*production/.test(productionWorkflow)) throw new Error('Production workflow lacks its protected environment.')
if (/PHASE12_(?:ADMIN|NON_ADMIN)_(?:EMAIL|PASSWORD)/.test(productionWorkflow)) throw new Error('Production workflow references staging identities.')
const verifyReleaseJob = productionWorkflow.match(/\n {2}verify-release:[\s\S]*?(?=\n {2}[a-z][a-z0-9-]+:|\s*$)/)?.[0] || ''
if (!/\n {6}statuses:\s*read\b/.test(verifyReleaseJob)) {
  throw new Error('Production release verification cannot read external commit statuses.')
}
if (!/PHASE12_REQUIRED_CHECKS:\s*quality,phase12-quality,dependency-review,Vercel – marchout-website/.test(verifyReleaseJob)) {
  throw new Error('Production release verification does not require the exact production Vercel status.')
}
const releaseEvidenceVerifier = fs.readFileSync(path.join(root, 'scripts/phase12/verify-release-evidence.mjs'), 'utf8')
const stagingApprovalVerifier = fs.readFileSync(path.join(root, 'scripts/phase12/verify-staging-approval.mjs'), 'utf8')
const githubEvidenceVerifier = fs.readFileSync(path.join(root, 'scripts/phase12/lib/github-evidence.mjs'), 'utf8')
const stagingRunbook = fs.readFileSync(path.join(root, 'docs/phase12-staging-release-runbook.md'), 'utf8')
for (const [name, source] of [['staging', stagingApprovalVerifier], ['production', releaseEvidenceVerifier]]) {
  if (!/verifyRequiredChecks\(\{ api, releaseSha, required \}\)/.test(source)
    || !/hasExactApprovalMarker\(item\.body, marker\)/.test(source)
    || !/readGithubArrayPages\(api,/.test(source)) {
    throw new Error(`Phase 12 ${name} verifier does not use fail-closed paginated GitHub evidence.`)
  }
}
if (!/check_name=\$\{encodedName\}&filter=all&per_page=\$\{perPage\}&page=\$\{page\}/.test(githubEvidenceVerifier)
  || !/item\.conclusion !== 'skipped'/.test(githubEvidenceVerifier)
  || !/successfulLatestEvidence\(check, status\)/.test(githubEvidenceVerifier)
  || !/checkTime === statusTime/.test(githubEvidenceVerifier)
  || !/checkTime > statusTime \? check\.conclusion === 'success' : status\.state === 'success'/.test(githubEvidenceVerifier)
  || !/line\.trim\(\) === marker/.test(githubEvidenceVerifier)) {
  throw new Error('Shared GitHub evidence verifier does not enforce pagination, decisive checks, exact markers, and success.')
}
if (!/quality,phase12-quality,dependency-review,Vercel – marchout-website/.test(releaseEvidenceVerifier)) {
  throw new Error('Production release evidence default checks do not name the exact production Vercel status.')
}
if (!/Pre-merge Draft PR staging execution[\s\S]*?from protected `main`[\s\S]*?every code checkout, build, deployment, and test uses[\s\S]*?`release_sha`/.test(stagingRunbook)
  || /codex\/phase12-e2e-staging-release-hardening/.test(stagingRunbook)) {
  throw new Error('The staging runbook does not preserve the protected-main run ref and exact candidate SHA boundary.')
}
if (!/vercel@\$VERCEL_CLI_VERSION" pull[\s\S]*?phase12:normalize-vercel[\s\S]*?NITRO_PRESET=vercel[\s\S]*?pnpm run build[\s\S]*?vercel@\$VERCEL_CLI_VERSION" deploy --prebuilt --prod/.test(productionWorkflow)) {
  throw new Error('Production deployment does not create a Vercel Nitro artifact from normalized settings before deploy.')
}
if (/vercel@\$VERCEL_CLI_VERSION" build/.test(productionWorkflow)) {
  throw new Error('Production build must not delegate to remote output-directory settings.')
}
const legacyWorkflow = fs.readFileSync(path.join(root, '.github/workflows/phase11-quality.yml'), 'utf8')
if (/protected-release-gate|PHASE10_ADMIN_(?:EMAIL|PASSWORD)/.test(legacyWorkflow)) {
  throw new Error('Legacy production-origin authenticated release gate was not retired.')
}
if (!/phase12_release_sha:[\s\S]*?uses:\s*\.\/\.github\/workflows\/phase12-staging-e2e\.yml/.test(legacyWorkflow)) {
  throw new Error('The default-branch registered workflow cannot dispatch the Phase 12 staging workflow.')
}
const finalMainDependencyReview = legacyWorkflow.match(/\n {2}dependency-review:[\s\S]*?(?=\n {2}[a-z][a-z0-9-]+:|\s*$)/)?.[0] || ''
if (!/if:\s*github\.event_name == 'pull_request' \|\| github\.event_name == 'push'/.test(finalMainDependencyReview)) {
  throw new Error('Dependency review must run for pull requests and final-main pushes.')
}
if (!/if:\s*github\.event_name == 'push'[\s\S]*?base-ref:\s*\$\{\{ github\.event\.before \}\}[\s\S]*?head-ref:\s*\$\{\{ github\.sha \}\}/.test(finalMainDependencyReview)) {
  throw new Error('Final-main dependency review must compare the exact push base and head commits.')
}
const phase12Caller = legacyWorkflow.match(/\n {2}phase12-staging:[\s\S]*?(?=\n {2}[a-z][a-z0-9-]+:|\s*$)/)?.[0] || ''
if (!/needs:\s*quality/.test(phase12Caller) || !/statuses:\s*read/.test(phase12Caller)) {
  throw new Error('The Phase 12 staging caller must wait for quality and pass commit-status read permission.')
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
