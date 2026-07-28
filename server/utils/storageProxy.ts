import type { SupabaseClient } from '@supabase/supabase-js'
import { defineEventHandler, isError, send, setResponseHeader, setResponseStatus, type H3Event } from 'h3'

const imageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
])

const documentMimeTypes = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])

const startsWithBytes = (data: Uint8Array, bytes: readonly number[]) =>
  bytes.every((value, index) => data[index] === value)

const ascii = (data: Uint8Array, start: number, end: number) =>
  String.fromCharCode(...data.slice(start, end))

const hasSafeSignature = (mimeType: string, data: Uint8Array) => {
  if (mimeType === 'image/jpeg') return data.length >= 4 && data[0] === 0xff && data[1] === 0xd8
    && data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9
  if (mimeType === 'image/png') return startsWithBytes(data, [137, 80, 78, 71, 13, 10, 26, 10])
  if (mimeType === 'image/webp') return ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 12) === 'WEBP'
  if (mimeType === 'image/gif') return ['GIF87a', 'GIF89a'].includes(ascii(data, 0, 6))
  if (mimeType === 'application/pdf') return ascii(data, 0, 5) === '%PDF-'
  if (mimeType === 'text/plain') return !data.includes(0)
  if (mimeType.includes('openxmlformats')) return startsWithBytes(data, [0x50, 0x4b])
  if (['application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint'].includes(mimeType)) {
    return startsWithBytes(data, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  }
  return false
}

const normalizedMimeType = (value: unknown) => String(value || '').split(';', 1)[0]!.trim().toLowerCase()

const contentDisposition = (mode: 'inline' | 'attachment', filename: string) => {
  const safe = safeDownloadName(filename)
  const fallback = safe.replace(/[^\x20-\x7e]/g, '_')
  const encoded = encodeURIComponent(safe).replace(/['()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`)
  return `${mode}; filename="${fallback}"; filename*=UTF-8''${encoded}`
}

const setStorageProxyHeaders = (event: H3Event) => {
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  setResponseHeader(event, 'Cross-Origin-Resource-Policy', 'same-origin')
}

export const defineStorageProxyHandler = (handler: (event: H3Event) => unknown | Promise<unknown>) => defineEventHandler(async (event) => {
  setStorageProxyHeaders(event)
  try {
    return await handler(event)
  } catch (error) {
    const safeError = isError(error) ? error : internalApiError()
    const data = safeError.data && typeof safeError.data === 'object' ? safeError.data as Record<string, unknown> : {}
    const statusCode = Number.isInteger(safeError.statusCode) && safeError.statusCode >= 400 && safeError.statusCode <= 599
      ? safeError.statusCode
      : 500
    const code = typeof data.code === 'string' && /^[A-Z][A-Z0-9_]{1,79}$/.test(data.code)
      ? data.code
      : 'INTERNAL_ERROR'
    const message = typeof data.message === 'string' && data.message.length <= 200
      ? data.message
      : statusCode === 404 ? 'Asset not found.' : 'The request could not be completed.'
    setResponseStatus(event, statusCode, message)
    setStorageProxyHeaders(event)
    return { statusCode, statusMessage: message, data: { statusCode, code, message } }
  }
})

export const sendStorageProxyObject = async (input: {
  event: H3Event
  supabase: SupabaseClient
  bucket: string
  path: string
  kind: 'image' | 'download'
  expectedMimeType?: unknown
  expectedSizeBytes?: unknown
  expectedSha256?: unknown
  disposition?: 'inline' | 'attachment'
  downloadName?: string
}) => {
  const { data, error } = await input.supabase.storage.from(input.bucket).download(input.path)
  if (error || !data) throw apiError(404, 'NOT_FOUND', 'Asset not found.')

  const bytes = new Uint8Array(await data.arrayBuffer())
  const maximum = input.kind === 'image' ? 10 * 1024 * 1024 : 20 * 1024 * 1024
  if (!bytes.length || bytes.length > maximum) throw apiError(502, 'STORAGE_ERROR', 'Stored asset failed integrity checks.')

  const allowedMimeTypes = input.kind === 'image' ? imageMimeTypes : new Set([...imageMimeTypes, ...documentMimeTypes])
  const expectedMimeType = normalizedMimeType(input.expectedMimeType)
  const storageMimeType = normalizedMimeType(data.type)
  const mimeType = expectedMimeType || storageMimeType
  if (!allowedMimeTypes.has(mimeType)
    || (storageMimeType && storageMimeType !== 'application/octet-stream' && storageMimeType !== mimeType)
    || !hasSafeSignature(mimeType, bytes)) {
    throw apiError(502, 'STORAGE_ERROR', 'Stored asset failed integrity checks.')
  }

  if (input.expectedSizeBytes !== undefined && input.expectedSizeBytes !== null) {
    const expectedSize = Number(input.expectedSizeBytes)
    if (!Number.isSafeInteger(expectedSize) || expectedSize !== bytes.length) {
      throw apiError(502, 'STORAGE_ERROR', 'Stored asset failed integrity checks.')
    }
  }

  const expectedSha256 = String(input.expectedSha256 || '').toLowerCase()
  if (expectedSha256) {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    const actualSha256 = [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('')
    if (!/^[0-9a-f]{64}$/.test(expectedSha256) || actualSha256 !== expectedSha256) {
      throw apiError(502, 'STORAGE_ERROR', 'Stored asset failed integrity checks.')
    }
  }

  setStorageProxyHeaders(input.event)
  setResponseHeader(input.event, 'Content-Type', mimeType)
  setResponseHeader(input.event, 'Content-Length', bytes.length)
  if (input.disposition && input.downloadName) {
    setResponseHeader(input.event, 'Content-Disposition', contentDisposition(input.disposition, input.downloadName))
  }
  return send(input.event, bytes)
}
