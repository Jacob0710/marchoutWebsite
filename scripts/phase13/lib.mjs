import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises'
import { dirname, extname, resolve, relative, sep } from 'node:path'

export const root = resolve(import.meta.dirname, '../..')

export const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
  }
  return value
}

export const stableJson = value => JSON.stringify(canonicalize(value))
export const prettyJson = value => `${JSON.stringify(canonicalize(value), null, 2)}\n`
export const sha256 = value => createHash('sha256').update(
  typeof value === 'string' || value instanceof Uint8Array ? value : stableJson(value)
).digest('hex')

export const readText = path => readFile(resolve(root, path), 'utf8')
export const readJson = async path => JSON.parse(await readText(path))
export const readJsonl = async path => (await readText(path))
  .split(/\r?\n/)
  .filter(line => line.trim())
  .map(line => JSON.parse(line))

export const writeText = async (path, value) => {
  const target = resolve(root, path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, value.replace(/\r\n/g, '\n'), 'utf8')
}

export const writeJson = (path, value) => writeText(path, prettyJson(value))

export const fileSha256 = async path => sha256(await readFile(resolve(root, path)))
export const fileSize = async path => (await stat(resolve(root, path))).size

export const countBy = (items, selector) => {
  const getValue = typeof selector === 'function' ? selector : item => item[selector]
  return Object.fromEntries([...new Set(items.map(getValue))]
    .sort((a, b) => String(a).localeCompare(String(b)))
    .map(value => [String(value), items.filter(item => getValue(item) === value).length]))
}

export const sortUnique = values => [...new Set(values.filter(value => value !== null && value !== undefined && value !== ''))]
  .sort((a, b) => String(a).localeCompare(String(b)))

export const parseCsv = (text) => {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index]
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (character === '"') quoted = false
      else cell += character
    } else if (character === '"') quoted = true
    else if (character === ',') {
      row.push(cell)
      cell = ''
    } else if (character === '\n') {
      row.push(cell.replace(/\r$/, ''))
      rows.push(row)
      row = []
      cell = ''
    } else cell += character
  }
  if (cell || row.length) {
    row.push(cell)
    rows.push(row)
  }
  const [headers = [], ...data] = rows.filter(candidate => candidate.some(value => value !== ''))
  return data.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])))
}

export const readCsv = async path => parseCsv(await readText(path))
const csvCell = value => `"${String(value ?? '').replaceAll('"', '""')}"`
export const toCsv = (columns, rows) => `${columns.join(',')}\n${rows.map(row => columns.map(column => csvCell(row[column])).join(',')).join('\n')}${rows.length ? '\n' : ''}`

export const trackedFiles = () => execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .split(/\r?\n/)
  .filter(Boolean)
  .map(file => file.replaceAll('\\', '/'))
  .sort((a, b) => a.localeCompare(b))

export const repoRelative = path => relative(root, resolve(root, path)).split(sep).join('/')

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

export const resolveLocalPath = (input, label) => {
  if (!input) throw new Error(`${label} is required.`)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) throw new Error(`${label} must be a local file path; URL input is forbidden.`)
  return resolve(root, input)
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
  else if (value && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) assertNoUrlValues(nested, label, `${path}.${key}`)
  } else if (typeof value === 'string' && /https?:\/\//i.test(value)) {
    throw new Error(`${label} contains a URL at ${path}; production exports must be sanitized local data.`)
  }
}

export const redactStoragePath = (value, bucket = null) => {
  if (value === null || value === undefined || value === '') return null
  const text = String(value)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) throw new Error('Storage path must not be a URL.')
  const cleanBucket = bucket && /^[a-z0-9-]+$/i.test(bucket) ? bucket : null
  return `${cleanBucket ? `${cleanBucket}/` : ''}<redacted>`
}

export const extensionFrom = (...values) => {
  for (const value of values) {
    if (!value) continue
    try {
      const parsed = new URL(value)
      const extension = extname(parsed.pathname).toLowerCase()
      if (extension) return extension
    } catch {
      const extension = extname(String(value).split(/[?#]/)[0]).toLowerCase()
      if (extension) return extension
    }
  }
  return null
}

export const mimeFromExtension = (extension) => ({
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
  '.pdf': 'application/pdf', '.doc': 'application/msword', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
}[extension] || null)
