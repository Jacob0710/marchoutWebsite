import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import test from 'node:test'
import { extname, resolve } from 'node:path'
import { compareProductionExport } from '../../scripts/phase13/compare-production-export.mjs'
import { readJson, root } from '../../scripts/phase13/lib.mjs'
import { normalizeProductionExport, runNormalizeProductionExportCli } from '../../scripts/phase13/normalize-production-export.mjs'

test('synthetic local export is sanitized and compared', async () => {
  const input = await readJson('tests/phase13/fixtures/synthetic-production-export/export-input.json')
  const baseline = await readJson('tests/phase13/fixtures/synthetic-production-export/baseline.json')
  const normalized = await normalizeProductionExport(input)
  assert.equal(normalized.records.find(item => item.key === 'synthetic:asset:extra').targetStoragePathRedacted, 'downloads/<redacted>')
  assert.doesNotMatch(JSON.stringify(normalized), /token=|https?:\/\//)
  const comparison = await compareProductionExport(baseline, normalized)
  assert.deepEqual(comparison.summary, { expected: 3, observed: 3, matched: 1, missingInProduction: 1, extraInProduction: 1, changed: 1 })
})

test('adapter rejects missing input and URL input', async () => {
  await assert.rejects(() => runNormalizeProductionExportCli([]), /--input is required/)
  await assert.rejects(() => runNormalizeProductionExportCli(['--input', 'https://example.invalid/export.json', '--output', 'synthetic.json']), /URL input is forbidden/)
})

test('adapter rejects URL values inside a production export', async () => {
  const input = await readJson('tests/phase13/fixtures/synthetic-production-export/export-input.json')
  input.records[0].targetStoragePath = 'https://example.invalid/private/file.jpg'
  await assert.rejects(() => normalizeProductionExport(input), /contains a URL/)
})

test('Phase 13 scripts have no network, SQL, or Supabase SDK execution path', async () => {
  const directory = resolve(root, 'scripts/phase13')
  const files = (await readdir(directory)).filter(file => file.endsWith('.mjs')).sort()
  for (const file of files) {
    const source = await readFile(resolve(directory, file), 'utf8')
    assert.doesNotMatch(source, /^import\s.+from\s+['"]node:https?['"]|^import\s.+@supabase\/|\bfetch\(/im, file)
  }
})

test('Phase 13 fixtures contain no large source media', async () => {
  const forbiddenExtensions = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.pdf', '.doc', '.docx', '.zip'])
  const walk = async directory => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => entry.isDirectory() ? walk(resolve(directory, entry.name)) : resolve(directory, entry.name)))).flat()
  const files = await walk(resolve(root, 'tests/phase13'))
  assert.deepEqual(files.filter(file => forbiddenExtensions.has(extname(file).toLowerCase())), [])
})
