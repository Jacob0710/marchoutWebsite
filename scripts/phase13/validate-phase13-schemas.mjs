import { readdir } from 'node:fs/promises'
import { basename } from 'node:path'
import { assertNoSensitiveMaterial, readJson, root, stableJson } from './lib.mjs'

const schemaPaths = {
  'source-item': 'schemas/phase13/source-item.schema.json',
  asset: 'schemas/phase13/asset.schema.json',
  'inventory-summary': 'schemas/phase13/inventory-summary.schema.json',
  'production-export': 'schemas/phase13/production-export.schema.json'
}

const typeMatches = (value, type) => {
  if (type === 'null') return value === null
  if (type === 'array') return Array.isArray(value)
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value)
  if (type === 'integer') return Number.isInteger(value)
  return typeof value === type
}

const resolveReference = (schema, reference) => {
  if (!reference.startsWith('#/')) throw new Error(`Only local schema references are supported: ${reference}`)
  return reference.slice(2).split('/').reduce((value, key) => value[key.replaceAll('~1', '/').replaceAll('~0', '~')], schema)
}

export const validateAgainstSchema = (value, rule, schema = rule, path = '$', errors = []) => {
  if (rule.$ref) return validateAgainstSchema(value, resolveReference(schema, rule.$ref), schema, path, errors)
  if (Object.hasOwn(rule, 'const') && stableJson(value) !== stableJson(rule.const)) errors.push(`${path} must equal ${stableJson(rule.const)}`)
  if (rule.enum && !rule.enum.some(candidate => stableJson(candidate) === stableJson(value))) errors.push(`${path} is not an allowed enum value`)
  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type]
    if (!types.some(type => typeMatches(value, type))) {
      errors.push(`${path} must have type ${types.join('|')}`)
      return errors
    }
  }
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) errors.push(`${path} is shorter than ${rule.minLength}`)
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(`${path} does not match ${rule.pattern}`)
  }
  if (typeof value === 'number' && rule.minimum !== undefined && value < rule.minimum) errors.push(`${path} must be >= ${rule.minimum}`)
  if (Array.isArray(value)) {
    if (rule.minItems !== undefined && value.length < rule.minItems) errors.push(`${path} has fewer than ${rule.minItems} items`)
    if (rule.uniqueItems && new Set(value.map(stableJson)).size !== value.length) errors.push(`${path} must contain unique items`)
    if (rule.items) value.forEach((item, index) => validateAgainstSchema(item, rule.items, schema, `${path}[${index}]`, errors))
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const required of rule.required || []) if (!Object.hasOwn(value, required)) errors.push(`${path}.${required} is required`)
    for (const [key, nested] of Object.entries(value)) {
      if (rule.properties?.[key]) validateAgainstSchema(nested, rule.properties[key], schema, `${path}.${key}`, errors)
      else if (rule.additionalProperties === false) errors.push(`${path}.${key} is not allowed`)
      else if (rule.additionalProperties && typeof rule.additionalProperties === 'object') validateAgainstSchema(nested, rule.additionalProperties, schema, `${path}.${key}`, errors)
    }
  }
  return errors
}

export const validateNamedSchema = async (name, value) => {
  const schemaPath = schemaPaths[name]
  if (!schemaPath) throw new Error(`Unknown Phase 13 schema: ${name}`)
  const schema = await readJson(schemaPath)
  const errors = validateAgainstSchema(value, schema)
  return { valid: errors.length === 0, errors, schemaPath }
}

const fixtureSchemaName = file => Object.keys(schemaPaths).find(name => basename(file).startsWith(`${name}.`))

export const validateRepositoryFixtures = async () => {
  const validDir = new URL('../../tests/phase13/fixtures/valid/', import.meta.url)
  const invalidDir = new URL('../../tests/phase13/fixtures/invalid/', import.meta.url)
  const validFiles = (await readdir(validDir)).filter(file => file.endsWith('.json')).sort()
  const invalidFiles = (await readdir(invalidDir)).filter(file => file.endsWith('.json')).sort()
  const results = []
  for (const [expected, directory, files] of [[true, validDir, validFiles], [false, invalidDir, invalidFiles]]) {
    for (const file of files) {
      const name = fixtureSchemaName(file)
      if (!name) throw new Error(`Fixture does not name its schema: ${file}`)
      const value = JSON.parse(await (await import('node:fs/promises')).readFile(new URL(file, directory), 'utf8'))
      const result = await validateNamedSchema(name, value)
      if (expected) assertNoSensitiveMaterial(value, file)
      if (result.valid !== expected) throw new Error(`${file} expected valid=${expected}; errors=${result.errors.join('; ')}`)
      results.push({ file, schema: name, expectedValid: expected, observedValid: result.valid })
    }
  }
  return results
}

if (process.argv[1] && new URL(`file:///${process.argv[1].replaceAll('\\', '/')}`).pathname.endsWith('/validate-phase13-schemas.mjs')) {
  const fixtures = await validateRepositoryFixtures()
  console.log(JSON.stringify({ status: 'ok', root, schemas: Object.keys(schemaPaths).length, fixtures: fixtures.length, validFixtures: fixtures.filter(item => item.expectedValid).length, invalidFixtures: fixtures.filter(item => !item.expectedValid).length }, null, 2))
}
