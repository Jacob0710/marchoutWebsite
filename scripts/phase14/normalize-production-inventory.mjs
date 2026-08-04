import { assertNoSensitiveMaterial, assertNoUrlValues, parseArgs, prettyJson, resolveRepositoryLocalPath, sha256, writeJson } from './lib.mjs'
import { runAuthorizationCheck } from './authorization-check.mjs'
import { validateNamedSchema } from './validate-phase14-schemas.mjs'

const sortBy = (items, key) => [...items].sort((a, b) => String(a[key]).localeCompare(String(b[key])))
const assertUnique = (items, key, label) => {
  const values = items.map(item => item[key])
  if (new Set(values).size !== values.length) throw new Error(`${label} contains duplicate ${key} values.`)
}

export const normalizeProductionInventory = async (input) => {
  assertNoSensitiveMaterial(input, 'Production inventory input')
  assertNoUrlValues(input, 'Production inventory input')
  const validation = await validateNamedSchema('inventory', input)
  if (!validation.valid) throw new Error(`Invalid production inventory: ${validation.errors.join('; ')}`)
  if ((input.environment === 'fixture') !== (input.sourceKind === 'local-fixture')) throw new Error('Fixture and owner-authorized source kinds must match their environment.')
  const output = {
    ...input,
    contentRecords: sortBy(input.contentRecords, 'recordKey'),
    storageBuckets: sortBy(input.storageBuckets, 'bucketId'),
    storageObjects: sortBy(input.storageObjects, 'objectKey'),
    relationships: sortBy(input.relationships, 'relationshipKey'),
    redirectSourcePaths: sortBy(input.redirectSourcePaths, 'redirectKey')
  }
  for (const [items, key, label] of [
    [output.contentRecords, 'recordKey', 'contentRecords'], [output.storageBuckets, 'bucketId', 'storageBuckets'],
    [output.storageObjects, 'objectKey', 'storageObjects'], [output.relationships, 'relationshipKey', 'relationships'],
    [output.redirectSourcePaths, 'redirectKey', 'redirectSourcePaths']
  ]) assertUnique(items, key, label)
  return output
}

export const runNormalizeCli = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv)
  const inputPath = resolveRepositoryLocalPath(args.input, '--input', { mustBeJson: true })
  const outputPath = resolveRepositoryLocalPath(args.output, '--output', { mustBeJson: true })
  const raw = JSON.parse(await (await import('node:fs/promises')).readFile(inputPath, 'utf8'))
  if (raw.environment === 'production') {
    const authorization = await runAuthorizationCheck(['--artifact', args.authorization || '.private/phase14-production-readonly-authorization.json'])
    if (authorization.status !== 'authorized-readonly') throw new Error(`Production inventory normalization blocked: ${authorization.reason}.`)
  }
  const output = await normalizeProductionInventory(raw)
  await writeJson(outputPath, output)
  return { status: 'ok', mode: 'local-file-only', outputSha256: sha256(prettyJson(output)), records: output.contentRecords.length + output.storageObjects.length + output.relationships.length }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/normalize-production-inventory.mjs')) {
  try { console.log(JSON.stringify(await runNormalizeCli(), null, 2)) }
  catch (error) { console.error(error.message); process.exitCode = 1 }
}
