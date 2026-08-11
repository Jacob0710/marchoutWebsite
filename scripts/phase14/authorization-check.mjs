import { access, readFile } from 'node:fs/promises'
import { assertNoSensitiveMaterial, parseArgs, resolveRepositoryLocalPath } from './lib.mjs'
import { validateNamedSchema } from './validate-phase14-schemas.mjs'

const requiredProhibitions = ['insert', 'update', 'delete', 'upload', 'move', 'publish', 'unpublish', 'redirect-activation', 'auth-admin', 'wix-recrawl', 'dns-change']

export const validateAuthorization = async (artifact, at = new Date()) => {
  const result = await validateNamedSchema('authorization', artifact)
  const errors = [...result.errors]
  const authorizedAt = Date.parse(artifact?.authorizedAt)
  const expiresAt = Date.parse(artifact?.expiresAt)
  if (!Number.isFinite(authorizedAt) || !Number.isFinite(expiresAt) || expiresAt <= authorizedAt) errors.push('expiresAt must be after authorizedAt')
  if (Number.isFinite(expiresAt) && expiresAt <= at.getTime()) errors.push('authorization is expired')
  if (artifact?.approvedOperations?.some(operation => /insert|update|delete|upload|move|publish|redirect|auth-admin|wix|dns/i.test(operation))) errors.push('mutation scope is forbidden')
  for (const operation of requiredProhibitions) if (!artifact?.prohibitedOperations?.includes(operation)) errors.push(`prohibitedOperations must include ${operation}`)
  return { valid: errors.length === 0, errors }
}

export const runAuthorizationCheck = async (argv = process.argv.slice(2)) => {
  const args = parseArgs(argv)
  const artifact = args.artifact || '.private/phase14-production-readonly-authorization.json'
  const target = resolveRepositoryLocalPath(artifact, '--artifact', { mustBeJson: true })
  try { await access(target) } catch { return { status: 'blocked', reason: 'authorization-artifact-missing', networkAttempted: false } }
  const value = JSON.parse(await readFile(target, 'utf8'))
  assertNoSensitiveMaterial(value, 'Authorization artifact')
  const result = await validateAuthorization(value, args.at ? new Date(args.at) : new Date())
  if (!result.valid) return { status: 'blocked', reason: 'authorization-artifact-invalid', errors: result.errors, networkAttempted: false }
  return { status: 'authorized-readonly', approvedOperations: value.approvedOperations, expiresAt: value.expiresAt, networkAttempted: false }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/authorization-check.mjs')) {
  try {
    const result = await runAuthorizationCheck()
    console.log(JSON.stringify(result, null, 2))
    if (result.status === 'blocked') process.exitCode = 2
  } catch (error) { console.error(error.message); process.exitCode = 1 }
}
