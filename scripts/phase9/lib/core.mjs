import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

export const root = resolve(import.meta.dirname, '../../..')
export const phase9Dir = resolve(root, 'migration/phase9')
export const cacheDir = resolve(root, '.phase9-cache')
export const snapshotAt = process.env.PHASE9_SNAPSHOT_AT || '2026-07-21T00:00:00+08:00'

export const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]))
  }
  return value
}

export const stableJson = (value) => JSON.stringify(canonicalize(value))
export const prettyJson = (value) => `${JSON.stringify(canonicalize(value), null, 2)}\n`
export const sha256 = (value) => createHash('sha256').update(typeof value === 'string' || value instanceof Uint8Array ? value : stableJson(value)).digest('hex')
export const readText = (path) => readFile(resolve(root, path), 'utf8')
export const readJson = async (path) => JSON.parse(await readFile(resolve(root, path), 'utf8'))

export const writeText = async (path, value) => {
  const target = resolve(root, path)
  await mkdir(dirname(target), { recursive: true })
  await writeFile(target, value, 'utf8')
}
export const writeJson = (path, value) => writeText(path, prettyJson(value))
export const writeJsonl = (path, values) => writeText(path, values.map(stableJson).join('\n') + (values.length ? '\n' : ''))

export const canonicalUrl = (input) => {
  const url = new URL(input)
  url.hostname = url.hostname.toLowerCase()
  url.hash = ''
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid|gclid|mc_)/i.test(key)) url.searchParams.delete(key)
  }
  if (url.pathname !== '/') url.pathname = url.pathname.replace(/\/+$/, '')
  return url.toString()
}

export const countBy = (items, key) => Object.fromEntries([...new Set(items.map((item) => item[key]))].sort().map((value) => [value, items.filter((item) => item[key] === value).length]))
export const csvCell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
export const toCsv = (columns, rows) => `${columns.join(',')}\n${rows.map((row) => columns.map((column) => csvCell(row[column])).join(',')).join('\n')}${rows.length ? '\n' : ''}`

export const assertNoSensitiveMaterial = (text, label) => {
  const patterns = [
    /sb_secret_/i, /service[_-]?role/i, /postgresql:\/\//i, /refresh_token/i,
    /access_token/i, /authorization\s*:/i, /set-cookie\s*:/i, /password\s*=/i,
    /[?&](?:token|signature|sig|key)=[^&\s]+/i
  ]
  const match = patterns.find((pattern) => pattern.test(text))
  if (match) throw new Error(`${label} contains prohibited sensitive material: ${match}`)
}

export const appCommit = async () => {
  const { execFileSync } = await import('node:child_process')
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
}
