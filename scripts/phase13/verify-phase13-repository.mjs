import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, readdir } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { buildOfflineBaseline } from './build-offline-baseline.mjs'
import { discoverEvidence } from './discover-evidence.mjs'
import { fileSha256, findSensitiveMaterial, parseCsv, readJson, root, trackedFiles } from './lib.mjs'
import { validateNamedSchema, validateRepositoryFixtures } from './validate-phase13-schemas.mjs'

const required = [
  'codexSteps/phase13.md',
  'schemas/phase13/source-item.schema.json',
  'schemas/phase13/asset.schema.json',
  'schemas/phase13/inventory-summary.schema.json',
  'schemas/phase13/production-export.schema.json',
  'scripts/phase13/lib.mjs',
  'scripts/phase13/discover-evidence.mjs',
  'scripts/phase13/normalize-source-inventory.mjs',
  'scripts/phase13/normalize-asset-inventory.mjs',
  'scripts/phase13/build-offline-baseline.mjs',
  'scripts/phase13/validate-phase13-schemas.mjs',
  'scripts/phase13/normalize-production-export.mjs',
  'scripts/phase13/compare-production-export.mjs',
  'scripts/phase13/verify-phase13-repository.mjs',
  'docs/content-asset-inventory-model.md',
  'docs/prelaunch-content-asset-verification.md',
  'docs/project-decisions.md',
  'outputs/phase-13-execution-status.md',
  'outputs/phase-13-evidence-index.json',
  'outputs/phase-13-evidence-index.md',
  'outputs/phase-13-normalized-source-items.json',
  'outputs/phase-13-offline-baseline.json',
  'outputs/phase-13-asset-classification.json',
  'outputs/phase-13-asset-classification.csv',
  'outputs/phase-13-asset-gap-report.md',
  'outputs/phase-13-completion-report.md'
]

const generatedOutputs = [
  'outputs/phase-13-evidence-index.json',
  'outputs/phase-13-evidence-index.md',
  'outputs/phase-13-normalized-source-items.json',
  'outputs/phase-13-offline-baseline.json',
  'outputs/phase-13-asset-classification.json',
  'outputs/phase-13-asset-classification.csv',
  'outputs/phase-13-asset-gap-report.md'
]

const hashOutputs = async () => Object.fromEntries(await Promise.all(generatedOutputs.map(async path => [path, await fileSha256(path)])))
const walk = async directory => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => entry.isDirectory() ? walk(resolve(directory, entry.name)) : resolve(directory, entry.name)))).flat()

export const verifyPhase13Repository = async () => {
  for (const path of required) if (!existsSync(resolve(root, path))) throw new Error(`Missing required Phase 13 file: ${path}`)
  const packageJson = await readJson('package.json')
  for (const script of ['phase13:discover', 'phase13:normalize', 'phase13:validate', 'phase13:test', 'phase13:verify', 'phase13:normalize-production-export', 'phase13:compare-production-export']) {
    if (!packageJson.scripts?.[script]) throw new Error(`Missing Phase 13 package script: ${script}`)
  }
  const gitignore = await readFile(resolve(root, '.gitignore'), 'utf8')
  if (!/^\.private\/phase14-production-export\/$/m.test(gitignore)) throw new Error('Future private Phase 14 production exports are not ignored.')
  if (trackedFiles().some(path => path.startsWith('.private/phase14-production-export/'))) throw new Error('A Phase 14 production export is tracked.')

  const phase12 = JSON.parse(execFileSync(process.execPath, ['scripts/phase12/verify-phase12-repository.mjs'], { cwd: root, encoding: 'utf8' }))
  if (phase12.status !== 'ok' || phase12.productionMutationScripts !== 0) throw new Error('Phase 12 repository regression failed.')

  const evidenceFirst = await discoverEvidence()
  await buildOfflineBaseline()
  const hashesFirst = await hashOutputs()
  const evidenceSecond = await discoverEvidence()
  const buildSecond = await buildOfflineBaseline()
  const hashesSecond = await hashOutputs()
  if (JSON.stringify(hashesFirst) !== JSON.stringify(hashesSecond)) throw new Error('Phase 13 derived outputs are not deterministic.')
  if (evidenceFirst.entries.length !== evidenceSecond.entries.length) throw new Error('Evidence discovery is not deterministic.')
  if (evidenceSecond.entries.some(item => item.containsSensitiveData)) throw new Error('Evidence index reports sensitive-data findings.')

  const fixtures = await validateRepositoryFixtures()
  const baseline = await readJson('outputs/phase-13-offline-baseline.json')
  const baselineValidation = await validateNamedSchema('inventory-summary', baseline)
  if (!baselineValidation.valid) throw new Error(`Offline baseline schema failure: ${baselineValidation.errors.join('; ')}`)
  const expectedCounts = {
    source_inventory_skip_items: 70,
    imported_target_records_draft: 70,
    source_assets: 398,
    migrated_storage_objects: 378,
    storage_assignments_total: 378,
    owner_references_total: 378,
    publication_reviews_total: 122,
    redirects_accepted_out_of_scope_total: 52
  }
  for (const [key, expected] of Object.entries(expectedCounts)) {
    if (baseline.countDomains[key]?.value !== expected) throw new Error(`${key} expected ${expected}; found ${baseline.countDomains[key]?.value}`)
  }
  if (baseline.historicalBaselines.currentProductionStateClaimed !== false) throw new Error('Historical counts are being represented as production truth.')
  if (!baseline.unresolvedRelationships.some(item => item.relationship === 'source_inventory_skip_items_to_imported_target_records_draft')) throw new Error('The two independent 70-count domains were not marked unresolved.')
  if (!baseline.warnings.some(item => item.includes('subtraction does not establish missing assets'))) throw new Error('The 398/378 count-domain warning is absent.')

  const assetOutput = await readJson('outputs/phase-13-asset-classification.json')
  if (assetOutput.metrics.source_unique_assets_total !== 397 || assetOutput.metrics.assigned_unique_source_objects_total !== 370 || assetOutput.metrics.unassigned_source_assets_total !== 27 || assetOutput.metrics.same_source_multi_assignment_groups_total !== 8 || assetOutput.metrics.canonical_asset_relationship_records_total !== 405) {
    throw new Error('Asset relationship reconciliation metrics changed unexpectedly.')
  }
  for (const record of assetOutput.records) {
    const validation = await validateNamedSchema('asset', record)
    if (!validation.valid) throw new Error(`Asset output schema failure for ${record.assetKey}: ${validation.errors.join('; ')}`)
  }
  const csv = parseCsv(await readFile(resolve(root, 'outputs/phase-13-asset-classification.csv'), 'utf8'))
  if (csv.length !== 405) throw new Error(`Owner review CSV expected 405 relationship rows; found ${csv.length}.`)
  if (csv.some(row => row.reviewDecision || row.ownerComment || row.verifiedAt || row.verifiedBy)) throw new Error('Owner review fields must remain unsigned during Phase 13.')

  const scripts = await walk(resolve(root, 'scripts/phase13'))
  const networkPattern = /^import\s.+from\s+['"]node:https?['"]|^import\s.+@supabase\/|\bfetch\(/im
  for (const file of scripts.filter(file => file.endsWith('.mjs'))) {
    const source = await readFile(file, 'utf8')
    if (networkPattern.test(source)) throw new Error(`Network-capable code is forbidden in Phase 13: ${file}`)
  }
  const phase13Files = [...await walk(resolve(root, 'scripts/phase13')), ...await walk(resolve(root, 'schemas/phase13')), ...await walk(resolve(root, 'docs'))].filter(file => /phase13|content-asset|prelaunch-content|project-decisions/i.test(file))
  const sensitiveFindings = []
  for (const file of [...phase13Files, ...generatedOutputs.map(path => resolve(root, path)), resolve(root, 'outputs/phase-13-execution-status.md'), resolve(root, 'outputs/phase-13-completion-report.md')]) {
    const text = await readFile(file, 'utf8')
    if (findSensitiveMaterial(text).length) sensitiveFindings.push(file)
  }
  if (sensitiveFindings.length) throw new Error(`Sensitive signatures detected in Phase 13 deliverables: ${sensitiveFindings.join(', ')}`)
  const mediaExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.zip'])
  const phase13TestFiles = await walk(resolve(root, 'tests/phase13'))
  if (phase13TestFiles.some(file => mediaExtensions.has(extname(file).toLowerCase()))) throw new Error('Large source media is present in Phase 13 tests.')

  execFileSync('git', ['diff', '--check'], { cwd: root, stdio: 'pipe' })
  return {
    status: 'ok',
    requiredFiles: required.length,
    evidenceEntries: evidenceSecond.entries.length,
    authoritativeEvidenceEntries: evidenceSecond.entries.filter(item => item.authorityLevel === 'authoritative').length,
    schemas: 4,
    fixtures: fixtures.length,
    sourceItems: buildSecond.sourceMetrics.source_inventory_items_total,
    assetRelationshipRecords: buildSecond.assetMetrics.canonical_asset_relationship_records_total,
    countDomains: expectedCounts,
    deterministicOutputs: generatedOutputs.length,
    deterministicHashes: hashesSecond,
    sensitiveFindings: 0,
    networkPaths: 0,
    productionQueries: 0,
    productionAuthenticatedSessions: 0,
    productionMutations: 0,
    liveWixRecrawls: 0,
    phase12Regression: 'ok'
  }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/verify-phase13-repository.mjs')) {
  try {
    console.log(JSON.stringify(await verifyPhase13Repository(), null, 2))
  } catch (error) {
    console.error(error.stack || error.message)
    process.exitCode = 1
  }
}
