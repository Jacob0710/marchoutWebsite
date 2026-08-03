import {
  createError,
  defineEventHandler,
  getHeader,
  readRawBody,
  setResponseStatus
} from 'h3'

const MAX_REPORT_BYTES = 64 * 1024

const safeOrigin = (value: unknown) => {
  if (typeof value !== 'string') return undefined
  try {
    return new URL(value).origin
  } catch {
    return undefined
  }
}

export default defineEventHandler(async (event) => {
  const declaredLength = Number(getHeader(event, 'content-length') || 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REPORT_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'CSP report too large' })
  }

  const raw = await readRawBody(event, 'utf8')
  if (raw && Buffer.byteLength(raw, 'utf8') > MAX_REPORT_BYTES) {
    throw createError({ statusCode: 413, statusMessage: 'CSP report too large' })
  }

  try {
    const payload = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    const report = (payload['csp-report'] || payload.body || payload) as Record<string, unknown>
    console.warn(JSON.stringify({
      event: 'security.csp.violation',
      documentOrigin: safeOrigin(report['document-uri'] || report.documentURL),
      blockedOrigin: safeOrigin(report['blocked-uri'] || report.blockedURL),
      directive: report['effective-directive'] || report.effectiveDirective
    }))
  } catch {
    console.warn(JSON.stringify({ event: 'security.csp.invalid-report' }))
  }

  setResponseStatus(event, 204)
  return null
})
