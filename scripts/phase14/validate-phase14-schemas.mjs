import { readJson, stableJson } from './lib.mjs'

const schemaPaths = {
  inventory: 'schemas/phase14/production-inventory-export.v1.schema.json',
  authorization: 'schemas/phase14/production-readonly-authorization.v1.schema.json'
}

const typeMatches = (value, type) => type === 'null' ? value === null
  : type === 'array' ? Array.isArray(value)
    : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : type === 'integer' ? Number.isInteger(value)
        : typeof value === type

const resolveReference = (schema, reference) => reference.slice(2).split('/').reduce((value, key) => value[key.replaceAll('~1', '/').replaceAll('~0', '~')], schema)

export const validateAgainstSchema = (value, rule, schema = rule, path = '$', errors = []) => {
  if (rule.$ref) return validateAgainstSchema(value, resolveReference(schema, rule.$ref), schema, path, errors)
  if (Object.hasOwn(rule, 'const') && stableJson(value) !== stableJson(rule.const)) errors.push(`${path} must equal ${stableJson(rule.const)}`)
  if (rule.enum && !rule.enum.some(candidate => stableJson(candidate) === stableJson(value))) errors.push(`${path} is not an allowed enum value`)
  if (rule.type) {
    const types = Array.isArray(rule.type) ? rule.type : [rule.type]
    if (!types.some(type => typeMatches(value, type))) { errors.push(`${path} must have type ${types.join('|')}`); return errors }
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
    }
  }
  return errors
}

export const validateNamedSchema = async (name, value) => {
  if (!schemaPaths[name]) throw new Error(`Unknown Phase 14 schema: ${name}`)
  const schema = await readJson(schemaPaths[name])
  const errors = validateAgainstSchema(value, schema)
  return { valid: errors.length === 0, errors, schemaPath: schemaPaths[name] }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/validate-phase14-schemas.mjs')) {
  const sample = await readJson('fixtures/phase14/production-inventory.sample.v1.json')
  const result = await validateNamedSchema('inventory', sample)
  if (!result.valid) { console.error(result.errors.join('\n')); process.exitCode = 1 }
  else console.log(JSON.stringify({ status: 'ok', schemas: 2, fixture: 'valid' }, null, 2))
}
