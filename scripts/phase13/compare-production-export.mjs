import { assertNoSensitiveMaterial, assertNoUrlValues, parseArgs, readJson, resolveLocalPath, writeJson } from './lib.mjs'
import { validateNamedSchema } from './validate-phase13-schemas.mjs'

const recordMap = records => new Map(records.map(item => [`${item.recordKind}:${item.key}`, item]))

export const compareProductionExport = async (baseline, production) => {
  if (!Array.isArray(baseline?.comparisonRecords)) throw new Error('Baseline comparisonRecords are required.')
  const validation = await validateNamedSchema('production-export', production)
  if (!validation.valid) throw new Error(`Production export is invalid: ${validation.errors.join('; ')}`)
  assertNoSensitiveMaterial(production, 'Production export comparison input')
  assertNoUrlValues(production, 'Production export comparison input')
  const expected = recordMap(baseline.comparisonRecords)
  const observed = recordMap(production.records)
  const missingInProduction = [...expected.entries()].filter(([key]) => !observed.has(key)).map(([key, record]) => ({ key, expectedFingerprint: record.fingerprint }))
  const extraInProduction = [...observed.entries()].filter(([key]) => !expected.has(key)).map(([key, record]) => ({ key, observedFingerprint: record.fingerprint }))
  const changed = [...expected.entries()].filter(([key, record]) => observed.has(key) && observed.get(key).fingerprint !== record.fingerprint).map(([key, record]) => ({ key, expectedFingerprint: record.fingerprint, observedFingerprint: observed.get(key).fingerprint }))
  const matched = [...expected.entries()].filter(([key, record]) => observed.get(key)?.fingerprint === record.fingerprint).length
  const result = {
    schemaVersion: 1,
    comparisonKind: 'repository-historical-baseline-to-sanitized-production-export',
    baselineIsHistoricalEvidence: true,
    productionReleaseSha: production.releaseSha,
    summary: { expected: expected.size, observed: observed.size, matched, missingInProduction: missingInProduction.length, extraInProduction: extraInProduction.length, changed: changed.length },
    missingInProduction,
    extraInProduction,
    changed,
    warnings: ['A comparison result is evidence for owner review; it does not publish, mutate, or automatically approve any production record.']
  }
  assertNoSensitiveMaterial(result, 'Production comparison output')
  assertNoUrlValues(result, 'Production comparison output')
  return result
}

export const runCompareProductionExportCli = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv)
  const baselinePath = resolveLocalPath(args.baseline, '--baseline')
  const productionPath = resolveLocalPath(args.production, '--production')
  const outputPath = resolveLocalPath(args.output, '--output')
  const result = await compareProductionExport(await readJson(baselinePath), await readJson(productionPath))
  await writeJson(outputPath, result)
  return { status: 'ok', ...result.summary }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/compare-production-export.mjs')) {
  try {
    console.log(JSON.stringify(await runCompareProductionExportCli(), null, 2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
