import { access, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { generateGate1Outputs, readiness } from './generate-gate1-outputs.mjs'
import { fileSha256, git, readCsv, readJson, readText, root, sha256, stableJson } from './lib.mjs'
import { humanColumns, validateOwnerReviewRows } from './owner-review.mjs'
import { scanPhase14 } from './scan-secrets-network.mjs'
import { validateNamedSchema } from './validate-phase14-schemas.mjs'

const baseline = '598882e371a01c832832d7141acec918143c133c'
const required = [
  '.github/workflows/phase14-gate1.yml',
  'codexSteps/phase14.md', 'outputs/phase-14-git-baseline-evidence.json', 'outputs/phase-14-execution-status.md',
  'outputs/phase-14-gate1-completion-report.md', 'outputs/phase-14-readiness-status.json', 'outputs/phase-14-evidence-index.md',
  'outputs/phase-14-evidence-discrepancy-register.md', 'outputs/phase-14-production-inventory-dry-run.json',
  'outputs/phase-14-reconciliation-dry-run.csv', 'outputs/phase-14-owner-review-working.csv', 'outputs/phase-14-authorization-request.md',
  'docs/phase14-production-readonly-inventory-runbook.md', 'docs/phase14-owner-review-runbook.md', 'docs/phase14-admin-uat-plan.md',
  'docs/phase14-admin-uat-checklist.md', 'docs/phase14-wix-cutover-decision.md', 'docs/phase14-redirect-activation-plan.md',
  'docs/phase14-cutover-runbook.md', 'docs/phase14-rollback-runbook.md',
  'schemas/phase14/production-inventory-export.v1.schema.json', 'schemas/phase14/production-readonly-authorization.v1.schema.json',
  'fixtures/phase14/production-inventory.sample.v1.json', 'fixtures/phase14/reconciliation-baseline.sample.v1.json',
  'scripts/phase14/lib.mjs', 'scripts/phase14/validate-phase14-schemas.mjs', 'scripts/phase14/normalize-production-inventory.mjs',
  'scripts/phase14/reconcile-inventory.mjs', 'scripts/phase14/owner-review.mjs', 'scripts/phase14/authorization-check.mjs',
  'scripts/phase14/scan-secrets-network.mjs', 'scripts/phase14/generate-gate1-outputs.mjs', 'scripts/phase14/verify-phase14-gate1.mjs',
  'scripts/phase14/production-export-command.template.txt', 'tests/phase14/phase14-schemas.test.mjs',
  'tests/phase14/phase14-reconciliation.test.mjs', 'tests/phase14/phase14-owner-review.test.mjs', 'tests/phase14/phase14-network-safety.test.mjs'
]
const generated = ['outputs/phase-14-readiness-status.json', 'outputs/phase-14-evidence-index.md', 'outputs/phase-14-production-inventory-dry-run.json', 'outputs/phase-14-reconciliation-dry-run.csv', 'outputs/phase-14-owner-review-working.csv']
const phase13Authoritative = [
  'outputs/phase-13-completion-report.md', 'outputs/phase-13-offline-baseline.json', 'outputs/phase-13-evidence-index.md',
  'outputs/phase-13-asset-gap-report.md', 'outputs/phase-13-asset-classification.csv', 'docs/prelaunch-content-asset-verification.md',
  'schemas/phase13/source-item.schema.json', 'schemas/phase13/asset.schema.json', 'schemas/phase13/inventory-summary.schema.json', 'schemas/phase13/production-export.schema.json'
]

const assert = (condition, message) => { if (!condition) throw new Error(message) }
const hashes = async paths => Object.fromEntries(await Promise.all(paths.map(async path => [path, sha256((await readText(path)).replace(/\r\n/g, '\n'))])))

const verifyHandoff = async () => {
  const path = 'outputs/phase-12-codex-handoff.md'
  assert(!git(['ls-files', '--', path]), 'Phase 12 handoff must remain untracked.')
  try { await access(new URL(`../../${path}`, import.meta.url)) } catch { return { present: false, tracked: false, acceptedForCi: true } }
  const bytes = await readFile(new URL(`../../${path}`, import.meta.url))
  assert(bytes.length === 10889, `Phase 12 handoff size changed: ${bytes.length}`)
  assert((await fileSha256(path)).toUpperCase() === 'C6464200384C2DE6C60BA970D1EE26123938CA2822AAD47EF5827D45140C9C25', 'Phase 12 handoff SHA-256 changed.')
  const status = git(['status', '--porcelain=v1', '--untracked-files=all', '--', path])
  assert(status === `?? ${path}`, `Phase 12 handoff status changed: ${status}`)
  return { present: true, tracked: false, bytes: bytes.length, sha256: await fileSha256(path), status }
}

export const verifyPhase14Gate1 = async () => {
  for (const path of required) await access(new URL(`../../${path}`, import.meta.url))
  const status = await readJson('outputs/phase-14-readiness-status.json')
  assert(stableJson(status) === stableJson(readiness), 'Readiness status differs from the canonical Gate 1 status.')
  assert(Object.values(status.metrics).every(value => value === 0), 'All Gate 1 safety metrics must be zero.')
  assert(status.historicalCountDomains.source_inventory_skip_items === 70 && status.historicalCountDomains.imported_target_records_draft === 70, 'The independent 70 count domains changed.')
  assert(status.historicalCountDomains.source_assets === 398 && status.historicalCountDomains.migrated_storage_objects === 378, 'The independent asset count domains changed.')
  assert(status.historicalCountDomains.currentProductionStateClaimed === false, 'Historical evidence must not be claimed as production state.')
  const inventory = await readJson('outputs/phase-14-production-inventory-dry-run.json')
  assert(inventory.environment === 'fixture' && inventory.sourceKind === 'local-fixture', 'Dry run must remain synthetic and local.')
  assert((await validateNamedSchema('inventory', inventory)).valid, 'Dry-run inventory schema validation failed.')
  const ownerRows = await readCsv('outputs/phase-14-owner-review-working.csv')
  assert(ownerRows.length === 405, `Owner review must contain 405 rows; observed ${ownerRows.length}.`)
  assert(ownerRows.every(row => humanColumns.every(column => row[column] === '')), 'Owner human fields must remain blank in Gate 1.')
  assert(validateOwnerReviewRows(ownerRows).length === 0, 'Owner review validation failed.')
  const discrepancy = await (await import('node:fs/promises')).readFile(new URL('../../outputs/phase-14-evidence-discrepancy-register.md', import.meta.url), 'utf8')
  assert(/28/.test(discrepancy) && /27/.test(discrepancy) && /UNRESOLVED/.test(discrepancy), 'The 28/27 discrepancy must remain unresolved.')
  for (const path of phase13Authoritative) {
    const expectedBlob = git(['rev-parse', `${baseline}:${path}`])
    const observedBlob = execFileSync('git', ['hash-object', '--path', path, path], { cwd: root, encoding: 'utf8' }).trim()
    assert(expectedBlob === observedBlob, `Phase 13 authoritative file changed: ${path}`)
  }
  const scan = await scanPhase14()
  assert(scan.networkFindings.length === 0, `Production network paths found: ${scan.networkFindings.join(', ')}`)
  assert(scan.secretFindings.length === 0, `Secret findings found: ${scan.secretFindings.join(', ')}`)
  const first = await hashes(generated)
  await generateGate1Outputs()
  const second = await hashes(generated)
  await generateGate1Outputs()
  const third = await hashes(generated)
  assert(stableJson(first) === stableJson(second) && stableJson(second) === stableJson(third), 'Gate 1 generated output hashes are not stable across consecutive runs.')
  const completionTagExists = git(['tag', '--list', 'phase-14-prelaunch-complete']) !== ''
  assert(!completionTagExists, 'A Phase 14 completion tag must not exist during Gate 1.')
  return { status: 'ok', requiredFiles: required.length, phase13AuthoritativeFiles: phase13Authoritative.length, generatedOutputs: generated.length, ownerReviewRows: ownerRows.length, deterministicRuns: 3, productionNetworkPaths: 0, secretFindings: 0, handoff: await verifyHandoff() }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/verify-phase14-gate1.mjs')) {
  try { console.log(JSON.stringify(await verifyPhase14Gate1(), null, 2)) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
