import assert from 'node:assert/strict'
import test from 'node:test'
import { readJson } from '../../scripts/phase13/lib.mjs'
import { validateNamedSchema, validateRepositoryFixtures } from '../../scripts/phase13/validate-phase13-schemas.mjs'

test('valid and invalid schema fixtures are enforced', async () => {
  const results = await validateRepositoryFixtures()
  assert.equal(results.filter(item => item.expectedValid).length, 4)
  assert.equal(results.filter(item => !item.expectedValid).length, 3)
})

test('unknown enum values and secret-like fields are rejected', async () => {
  const unknown = await validateNamedSchema('source-item', await readJson('tests/phase13/fixtures/invalid/source-item.unknown-enum.invalid.json'))
  assert.equal(unknown.valid, false)
  assert.match(unknown.errors.join('\n'), /allowed enum/)
  const secret = await validateNamedSchema('asset', await readJson('tests/phase13/fixtures/invalid/asset.secret-field.invalid.json'))
  assert.equal(secret.valid, false)
  assert.match(secret.errors.join('\n'), /access_token is not allowed/)
})

test('signed URLs cannot satisfy the sanitized production export schema', async () => {
  const result = await validateNamedSchema('production-export', await readJson('tests/phase13/fixtures/invalid/production-export.signed-url.invalid.json'))
  assert.equal(result.valid, false)
  assert.match(result.errors.join('\n'), /does not match/)
})
