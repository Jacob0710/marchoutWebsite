import assert from 'node:assert/strict'
import test from 'node:test'
import { readJson } from '../../scripts/phase14/lib.mjs'
import { normalizeProductionInventory } from '../../scripts/phase14/normalize-production-inventory.mjs'
import { validateAuthorization } from '../../scripts/phase14/authorization-check.mjs'
import { validateNamedSchema } from '../../scripts/phase14/validate-phase14-schemas.mjs'

const validAuthorization = () => ({
  schemaVersion: 1, phase: 14, environment: 'production', scope: 'production-readonly-inventory', readonly: true,
  authorizedBy: 'synthetic-owner-fixture', authorizedAt: '2026-08-04T00:00:00Z', expiresAt: '2026-08-04T02:00:00Z',
  approvedOperations: ['select-content-metadata', 'list-storage-metadata', 'select-editorial-metadata', 'export-sanitized-inventory'],
  prohibitedOperations: ['insert', 'update', 'delete', 'upload', 'move', 'publish', 'unpublish', 'redirect-activation', 'auth-admin', 'wix-recrawl', 'dns-change'],
  credentialHandlingRules: ['process-only injection', 'never log credentials'], evidenceOutputLocation: '.private/phase14-production-export/inventory.json'
})

test('valid production inventory fixture passes', async () => assert.equal((await validateNamedSchema('inventory', await readJson('fixtures/phase14/production-inventory.sample.v1.json'))).valid, true))

for (const [name, mutate, pattern] of [
  ['missing version fails', value => { delete value.schemaVersion }, /schemaVersion is required/],
  ['unknown incompatible version fails', value => { value.schemaVersion = 2 }, /must equal 1/],
  ['malformed relationship fails', value => { value.relationships[0].assignmentOrdinal = -1 }, />= 0/]
]) test(name, async () => {
  const value = structuredClone(await readJson('fixtures/phase14/production-inventory.sample.v1.json'))
  mutate(value)
  assert.match((await validateNamedSchema('inventory', value)).errors.join('\n'), pattern)
})

test('secret-like fields fail closed', async () => {
  const value = structuredClone(await readJson('fixtures/phase14/production-inventory.sample.v1.json'))
  value.access_token = 'not-a-real-value'
  await assert.rejects(() => normalizeProductionInventory(value), /sensitive material/)
})

test('valid bounded read-only authorization passes', async () => assert.equal((await validateAuthorization(validAuthorization(), new Date('2026-08-04T01:00:00Z'))).valid, true))

test('invalid authorization fails', async () => {
  const value = validAuthorization()
  delete value.authorizedBy
  assert.equal((await validateAuthorization(value, new Date('2026-08-04T01:00:00Z'))).valid, false)
})

test('expired authorization fails', async () => assert.match((await validateAuthorization(validAuthorization(), new Date('2026-08-04T03:00:00Z'))).errors.join('\n'), /expired/))

test('mutation-scope authorization fails', async () => {
  const value = validAuthorization()
  value.approvedOperations.push('delete')
  assert.equal((await validateAuthorization(value, new Date('2026-08-04T01:00:00Z'))).valid, false)
})
