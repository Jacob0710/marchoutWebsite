import { assertNoSensitiveMaterial, assertNoUrlValues, parseArgs, readJson, redactStoragePath, resolveLocalPath, sha256, stableJson, writeJson } from './lib.mjs'
import { validateNamedSchema } from './validate-phase13-schemas.mjs'

const topLevelFields = new Set(['schemaVersion', 'exportKind', 'releaseSha', 'records'])
const recordFields = new Set(['recordKind', 'key', 'fingerprint', 'status', 'ownerKind', 'targetBucket', 'targetStoragePath', 'targetStoragePathRedacted', 'databaseReferenceKey', 'privacyStatus'])

export const normalizeProductionExport = async (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Production export must be a JSON object.')
  for (const key of Object.keys(input)) if (!topLevelFields.has(key)) throw new Error(`Unknown production export field: ${key}`)
  if (input.schemaVersion !== 1) throw new Error('Production export schemaVersion must be 1.')
  if (input.exportKind !== 'sanitized-production-content-asset-inventory') throw new Error('Unexpected production export kind.')
  if (!/^[0-9a-f]{40}$/.test(input.releaseSha || '')) throw new Error('Production export releaseSha must be a 40-character lowercase Git SHA.')
  if (!Array.isArray(input.records)) throw new Error('Production export records must be an array.')
  assertNoUrlValues(input, 'Production export input')
  const records = input.records.map((record, index) => {
    if (!record || typeof record !== 'object' || Array.isArray(record)) throw new Error(`Production export record ${index} must be an object.`)
    for (const key of Object.keys(record)) if (!recordFields.has(key)) throw new Error(`Unknown or secret-like production export record field: ${key}`)
    const normalized = {
      recordKind: record.recordKind,
      key: record.key,
      status: record.status || 'unknown',
      ownerKind: record.ownerKind || 'unresolved',
      targetBucket: record.targetBucket || null,
      targetStoragePathRedacted: redactStoragePath(record.targetStoragePathRedacted ?? record.targetStoragePath, record.targetBucket || null),
      databaseReferenceKey: record.databaseReferenceKey || null,
      privacyStatus: record.privacyStatus || 'unknown'
    }
    const fingerprint = /^[0-9a-f]{64}$/.test(record.fingerprint || '') ? record.fingerprint : sha256(normalized)
    return { recordKind: normalized.recordKind, key: normalized.key, fingerprint, status: normalized.status, ownerKind: normalized.ownerKind, targetBucket: normalized.targetBucket, targetStoragePathRedacted: normalized.targetStoragePathRedacted, databaseReferenceKey: normalized.databaseReferenceKey, privacyStatus: normalized.privacyStatus }
  }).sort((a, b) => `${a.recordKind}:${a.key}`.localeCompare(`${b.recordKind}:${b.key}`))
  const keys = records.map(item => `${item.recordKind}:${item.key}`)
  if (new Set(keys).size !== keys.length) throw new Error('Production export contains duplicate recordKind/key pairs.')
  const output = { schemaVersion: 1, exportKind: input.exportKind, releaseSha: input.releaseSha, records }
  assertNoSensitiveMaterial(output, 'Normalized production export')
  assertNoUrlValues(output, 'Normalized production export')
  const validation = await validateNamedSchema('production-export', output)
  if (!validation.valid) throw new Error(`Normalized production export is invalid: ${validation.errors.join('; ')}`)
  return output
}

export const runNormalizeProductionExportCli = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv)
  const inputPath = resolveLocalPath(args.input, '--input')
  const outputPath = resolveLocalPath(args.output, '--output')
  const normalized = await normalizeProductionExport(await readJson(inputPath))
  await writeJson(outputPath, normalized)
  return { status: 'ok', inputKind: 'local-file', records: normalized.records.length, releaseSha: normalized.releaseSha, outputSha256: sha256(stableJson(normalized)) }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/normalize-production-export.mjs')) {
  try {
    console.log(JSON.stringify(await runNormalizeProductionExportCli(), null, 2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
