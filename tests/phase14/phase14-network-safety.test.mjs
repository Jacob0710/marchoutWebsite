import assert from 'node:assert/strict'
import test from 'node:test'
import { runAuthorizationCheck } from '../../scripts/phase14/authorization-check.mjs'
import { readJson, resolveRepositoryLocalPath } from '../../scripts/phase14/lib.mjs'
import { normalizeProductionInventory } from '../../scripts/phase14/normalize-production-inventory.mjs'
import { detectNetworkSource, scanPhase14 } from '../../scripts/phase14/scan-secrets-network.mjs'

test('HTTP and HTTPS URL inputs are rejected in Gate 1', () => {
  assert.throws(() => resolveRepositoryLocalPath('http://example.invalid/x.json', '--input'), /forbidden/)
  assert.throws(() => resolveRepositoryLocalPath('https://example.invalid/x.json', '--input'), /forbidden/)
})

test('database URL and repository path traversal are rejected', () => {
  const databaseUrl = ['postgresql', '://user:pass@example.invalid/db'].join('')
  assert.throws(() => resolveRepositoryLocalPath(databaseUrl, '--input'), /forbidden|database URL/)
  assert.throws(() => resolveRepositoryLocalPath('../outside.json', '--input'), /inside the repository/)
})

test('Supabase client, fetch, HTTP and socket paths are detected', () => {
  for (const source of ["import { createClient } from '@supabase/supabase-js'", "fetch('https://example.invalid')", "import net from 'node:net'", "import https from 'node:https'"]) assert.equal(detectNetworkSource(source), true)
})

test('local fixture is accepted and unauthorized environment pairing is rejected', async () => {
  const fixture = await readJson('fixtures/phase14/production-inventory.sample.v1.json')
  assert.equal((await normalizeProductionInventory(fixture)).environment, 'fixture')
  fixture.environment = 'production'
  await assert.rejects(() => normalizeProductionInventory(fixture), /must match their environment/)
})

test('missing authorization blocks without a network attempt', async () => {
  const result = await runAuthorizationCheck(['--artifact', '.private/definitely-missing-phase14.json'])
  assert.deepEqual(result, { status: 'blocked', reason: 'authorization-artifact-missing', networkAttempted: false })
})

test('Phase 14 executable scripts contain no production network path or secret finding', async () => assert.deepEqual(await scanPhase14(), { networkFindings: [], secretFindings: [] }))
