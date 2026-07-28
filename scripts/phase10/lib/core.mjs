import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export const root = resolve(import.meta.dirname, '../../..')
export const phase10Cache = resolve(root, '.phase10-cache')
export const phase10Private = resolve(root, '.phase10-private')
export const phase9SnapshotSha256 = '3a6a00bcd5a5b8030ab5da6b61cd597f2df4c0762edb46dd9f8655e003cceb60'

export const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  return value
}
export const stableJson = (value) => JSON.stringify(canonicalize(value))
export const sha256 = (value) => createHash('sha256').update(typeof value === 'string' || value instanceof Uint8Array ? value : stableJson(value)).digest('hex')
export const redirectKeyForSource = (sourceKey, sourcePath) => `R9-${sha256(`${sourceKey}\n${sourcePath.normalize('NFC')}`).slice(0, 24)}`
export const encodedLegacyPathForSource = (sourcePath) => encodeURI(sourcePath.normalize('NFC'))
  .replace(/%[0-9a-f]{2}/gi, (value) => value.toUpperCase())
export const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))
export const readJsonl = async (path) => {
  const text = await readFile(resolve(root, path), 'utf8')
  return text.trim() ? text.trim().split(/\r?\n/).map(JSON.parse) : []
}
export const writePrivateJson = async (path, value) => {
  const target = resolve(root, path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, `${JSON.stringify(canonicalize(value), null, 2)}\n`, 'utf8')
}

export const parseCsv = (text) => {
  const rows = []
  let row = [], value = '', quoted = false
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { value += '"'; index += 1 }
      else if (char === '"') quoted = false
      else value += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(value); value = '' }
    else if (char === '\n') { row.push(value.replace(/\r$/, '')); rows.push(row); row = []; value = '' }
    else value += char
  }
  if (value || row.length) { row.push(value); rows.push(row) }
  const [headers, ...values] = rows.filter((item) => item.some((cell) => cell !== ''))
  return values.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ''])))
}
export const readCsv = async (path) => parseCsv(await readFile(resolve(root, path), 'utf8'))

export const gitHead = async () => {
  const { execFileSync } = await import('node:child_process')
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
}

export const assertNoSecretShape = (value, label) => {
  const text = stableJson(value)
  const match = [/sb_secret_/i, /service[_-]?role/i, /refresh_token/i, /access_token/i, /password/i, /authorization/i, /set-cookie/i].find((pattern) => pattern.test(text))
  if (match) throw new Error(`${label} contains prohibited secret-shaped material`)
}
