import { defineEventHandler, getRequestHost, getRequestURL, sendRedirect } from 'h3'
import redirectConfigJson from '../../migration/phase10/redirect-config.json'

interface RedirectConfig {
  canonicalOrigin: string | null
  sourceHosts: string[]
  preserveQuery: boolean
  entries: Array<{ sourceEncodedPath: string; targetPath: string | null; statusCode: number | null; active: boolean }>
}

const redirectConfig = redirectConfigJson as RedirectConfig

const normalizeEncodedPath = (value: string) => value.replace(/%[0-9a-f]{2}/gi, (item) => item.toUpperCase())
const activeEntries = redirectConfig.entries.filter((item) => item.active)
const redirects = new Map(activeEntries.map((item) => [normalizeEncodedPath(item.sourceEncodedPath), item]))
const sourceHosts = new Set(redirectConfig.sourceHosts.map((host) => host.toLowerCase()))

if (activeEntries.length && (!redirectConfig.canonicalOrigin || !sourceHosts.size)) {
  throw new Error('Active Phase 10 redirects require a canonical origin and explicit source hosts')
}

export default defineEventHandler(async (event) => {
  if (!redirects.size || !['GET', 'HEAD'].includes(event.method)) return
  const host = getRequestHost(event, { xForwardedHost: true }).toLowerCase()
  if (!sourceHosts.has(host)) return
  const url = getRequestURL(event)
  const entry = redirects.get(normalizeEncodedPath(url.pathname))
  if (!entry?.targetPath || entry.statusCode !== 301 || !redirectConfig.canonicalOrigin) return
  const location = `${redirectConfig.canonicalOrigin}${entry.targetPath}${redirectConfig.preserveQuery ? url.search : ''}`
  writeOperationalLog(event, {
    action: 'legacy_redirect',
    result: 'redirected',
    redirectSourceHash: await safePathHash(url.pathname),
    status: 301
  })
  return sendRedirect(event, location, 301)
})
