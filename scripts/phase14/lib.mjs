import { execFileSync } from 'node:child_process'
import { readFile, stat, writeFile, mkdir } from 'node:fs/promises'
import { dirname, relative, resolve, sep } from 'node:path'
import { createHash } from 'node:crypto'

export const root = resolve(import.meta.dirname, '../..')

export const canonicalize = (value) => Array.isArray(value)
  ? value.map(canonicalize)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value

export const stableJson = value => JSON.stringify(canonicalize(value))
export const prettyJson = value => `${JSON.stringify(canonicalize(value), null, 2)}\n`
export const sha256 = value => createHash('sha256').update(typeof value === 'string' || value instanceof Uint8Array ? value : stableJson(value)).digest('hex')
export const readText = path => readFile(resolve(root, path), 'utf8')
export const readJson = async path => JSON.parse(await readText(path))
export const fileSha256 = async path => sha256(await readFile(resolve(root, path)))
export const fileSize = async path => (await stat(resolve(root, path))).size

export const writeText = async (path, value) => {
  const target = resolve(root, path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, value.replace(/\r\n/g, '\n'), 'utf8')
}
export const writeJson = (path, value) => writeText(path, prettyJson(value))

export const parseCsv = (text) => {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { cell += '"'; index += 1 }
      else if (character === '"') quoted = false
      else cell += character
    } else if (character === '"') quoted = true
    else if (character === ',') { row.push(cell); cell = '' }
    else if (character === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = '' }
    else cell += character
  }
  if (cell || row.length) { row.push(cell); rows.push(row) }
  const [headers = [], ...data] = rows.filter(candidate => candidate.some(value => value !== ''))
  return data.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

export const readCsv = async path => parseCsv(await readText(path))
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`
export const toCsv = (columns, rows) => `${columns.join(',')}\n${rows.map(row => columns.map(column => csvCell(row[column])).join(',')).join('\n')}${rows.length ? '\n' : ''}`

export const parseArgs = (argv = process.argv.slice(2)) => {
  const values = {}
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`)
    const key = argument.slice(2)
    const value = argv[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`)
    values[key] = value
    index += 1
  }
  return values
}

export const resolveRepositoryLocalPath = (input, label, { mustBeJson = false } = {}) => {
  if (!input) throw new Error(`${label} is required.`)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input) || /^\\\\/.test(input)) throw new Error(`${label} must be a repository-local file path; URL or network input is forbidden.`)
  if (/postgres(?:ql)?:\/\//i.test(input)) throw new Error(`${label} contains a database URL and is forbidden.`)
  const target = resolve(root, input)
  const rel = relative(root, target)
  if (!rel || rel.startsWith('..') || rel.split(sep).includes('..')) throw new Error(`${label} must stay inside the repository.`)
  if (mustBeJson && !target.toLowerCase().endsWith('.json')) throw new Error(`${label} must be a JSON file.`)
  return target
}

const secretKeyPattern = /(?:^|_)(?:access[_-]?token|refresh[_-]?token|authorization|cookie|jwt|password|private[_-]?key|secret|service[_-]?role|database[_-]?(?:url|password)|connection[_-]?string|signed[_-]?url)(?:$|_)/i
const secretValuePatterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[opsu]_[A-Za-z0-9_]{20,}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
  /postgres(?:ql)?:\/\/[^/\s:@]+:[^@\s/]+@/i,
  /[?&](?:token|signature|sig|key)=[^&\s]+/i
]

export const findSensitiveMaterial = (value, path = '$', findings = []) => {
  if (Array.isArray(value)) value.forEach((item, index) => findSensitiveMaterial(item, `${path}[${index}]`, findings))
  else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (secretKeyPattern.test(key)) findings.push(`${path}.${key}:secret-like-field`)
      findSensitiveMaterial(nested, `${path}.${key}`, findings)
    }
  } else if (typeof value === 'string' && secretValuePatterns.some(pattern => pattern.test(value))) findings.push(`${path}:secret-signature`)
  return findings
}

export const assertNoSensitiveMaterial = (value, label) => {
  const findings = findSensitiveMaterial(value)
  if (findings.length) throw new Error(`${label} contains prohibited sensitive material: ${findings.join(', ')}`)
}

export const assertNoUrlValues = (value, label, path = '$') => {
  if (Array.isArray(value)) value.forEach((item, index) => assertNoUrlValues(item, label, `${path}[${index}]`))
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, nested]) => assertNoUrlValues(nested, label, `${path}.${key}`))
  else if (typeof value === 'string' && /(?:https?|postgres(?:ql)?):\/\//i.test(value)) throw new Error(`${label} contains a URL at ${path}; Gate 1 accepts sanitized local data only.`)
}

export const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
