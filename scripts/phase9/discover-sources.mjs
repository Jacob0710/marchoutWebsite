import { createClient } from '@supabase/supabase-js'
import { mkdir, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { mockActivities, mockFaq, mockFiles, mockPosts, mockPrograms, mockYearSummaries, siteSettings } from '../../utils/mockData.ts'
import { appCommit, assertNoSensitiveMaterial, cacheDir, canonicalUrl, readJson, readText, sha256, snapshotAt, writeJson } from './lib/core.mjs'

const staticPages = ['/about', '/organization', '/programs', '/programs/breakfast', '/programs/exploration', '/contact']
const staticFiles = Object.fromEntries(await Promise.all(staticPages.map(async (route) => {
  const file = route === '/programs' ? 'pages/programs/index.vue' : `pages${route}.vue`
  const body = await readText(file)
  return [route, { file, sha256: sha256(body), byteSize: Buffer.byteLength(body) }]
})))

const publicDiscovery = [
  { title: '中原大學學生會社團總覽', url: 'https://sa.cycu.edu.tw/%E5%AD%B8%E7%94%9F%E6%9C%83%E7%A4%BE%E5%9C%98/', observation: 'Lists 愛潮關懷社 as a service club.' },
  { title: '中原大學社團資料', url: 'https://itouch.cycu.edu.tw/active_system/active_group/hrcb001.jsp', observation: 'Lists 愛潮關懷社.' },
  { title: '中原大學 111 學年度社團分類表', url: 'https://oosa.cycu.edu.tw/wp-content/uploads/%E7%A4%BE%E5%9C%98%E5%90%8D%E7%A8%B1%E4%B8%AD%E8%8B%B1%E6%96%87%E5%B0%8D%E7%85%A7.pdf', observation: 'Maps 愛潮關懷社 to March Out Club.' },
  { title: '中原大學早餐募款新聞', url: 'https://www.cycu.edu.tw/?p=19305', observation: 'Confirms a historical club activity; the Wix site is authoritative for Phase 9 migration.' }
].map((item) => ({ ...item, url: canonicalUrl(item.url) }))

const decodeHtml = (value = '') => value
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&nbsp;|&#160;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')

const normalizeText = (value = '') => decodeHtml(value)
  .normalize('NFC')
  .replace(/[\u200B-\u200D\uFEFF]/g, '')
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  .replace(/\r/g, '')
  .replace(/[ \t]+\n/g, '\n')
  .replace(/\n[ \t]+/g, '\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim()

const htmlToText = (html = '') => normalizeText(html
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<(script|style|noscript|svg|head)\b[\s\S]*?<\/\1>/gi, '')
  .replace(/<br\s*\/?\s*>/gi, '\n')
  .replace(/<\/(?:p|div|section|article|header|footer|nav|main|h[1-6]|li|ul|ol|a|button)>/gi, '\n')
  .replace(/<[^>]+>/g, ' '))

const chromeLines = new Set([
  'Skip to Main Content', 'This website was built on Wix. Create yours today.', 'Get Started',
  'MARCH OUT FOR LOVE', 'HOME', 'ABOUT', 'ORGANAIZATION', 'ALMANAC',
  'Do Not Sell My Personal Information'
])
const contentText = (value) => normalizeText(value.split('\n').map((line) => line.trim()).filter((line) => line && !chromeLines.has(line) && !/^© 2024 By MARCH OUT FOR LOVE$/i.test(line)).join('\n'))

const attr = (tag, name) => decodeHtml(tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1] ?? '')
const safeUrl = (value, base) => {
  try { return canonicalUrl(new URL(value, base).toString()) } catch { return null }
}
const extractLinks = (html, base) => {
  const links = []
  for (const match of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = safeUrl(attr(match[1], 'href'), base)
    if (!href || !href.startsWith('https://')) continue
    links.push({ url: href, text: htmlToText(match[2]).slice(0, 500) })
  }
  return [...new Map(links.map((item) => [`${item.url}\u0000${item.text}`, item])).values()]
}
const originalWixMediaUrl = (value) => {
  const parsed = safeUrl(decodeHtml(value), 'https://static.wixstatic.com/')
  if (!parsed) return null
  const url = new URL(parsed)
  if (url.hostname !== 'static.wixstatic.com' || !url.pathname.startsWith('/media/')) return null
  url.pathname = url.pathname.split('/v1/')[0]
  url.search = ''
  return url.toString()
}
const extractImages = (html, base) => {
  const images = []
  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const renderedUrl = safeUrl(attr(match[0], 'src') || attr(match[0], 'data-src'), base)
    const source = originalWixMediaUrl(renderedUrl)
    if (source) images.push({ url: source, downloadUrl: renderedUrl, alt: normalizeText(attr(match[0], 'alt')).slice(0, 300) })
  }
  for (const match of html.matchAll(/https:\/\/static\.wixstatic\.com\/media\/[^"'\\\s<>]+/gi)) {
    const renderedUrl = safeUrl(decodeHtml(match[0]), base)
    const source = originalWixMediaUrl(renderedUrl)
    if (source) images.push({ url: source, downloadUrl: renderedUrl, alt: '' })
  }
  const grouped = new Map()
  for (const image of images) {
    const item = grouped.get(image.url) || { url: image.url, downloadUrls: [], alt: '' }
    if (image.downloadUrl && image.downloadUrl !== image.url) item.downloadUrls.push(image.downloadUrl)
    if (!item.alt && image.alt) item.alt = image.alt
    grouped.set(image.url, item)
  }
  return [...grouped.values()].map((item) => ({ ...item, downloadUrls: [...new Set(item.downloadUrls)] }))
}
const extractCanonical = (html, base) => safeUrl(html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] || html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["']/i)?.[1] || base, base)
const extractTitle = (html) => normalizeText(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '')
const extractViewerModel = (html) => {
  const raw = html.match(/<script\b[^>]*id=["']wix-viewer-model["'][^>]*>([\s\S]*?)<\/script>/i)?.[1]
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

const userAgent = 'MarchOutPhase9Migration/1.0 (+public archival migration; max 1 request/second)'
let lastRequestAt = 0
const rateLimit = async (extra = 0) => {
  const delay = Math.max(0, 1050 - (Date.now() - lastRequestAt), extra)
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay))
  lastRequestAt = Date.now()
}
const request = async (url, attempt = 0) => {
  await rateLimit(attempt ? 2 ** attempt * 1000 : 0)
  const response = await fetch(url, { redirect: 'manual', headers: { 'user-agent': userAgent, accept: '*/*' } })
  const data = new Uint8Array(await response.arrayBuffer())
  if ((response.status === 429 || response.status >= 500) && attempt < 3) return request(url, attempt + 1)
  return { response, data }
}
const fetchWithEvidence = async (input) => {
  let current = canonicalUrl(input)
  const chain = []
  for (let hop = 0; hop < 10; hop += 1) {
    const { response, data } = await request(current)
    const location = response.headers.get('location')
    chain.push({ url: current, status: response.status, location: location ? safeUrl(location, current) : null })
    if (response.status >= 300 && response.status < 400 && location) {
      current = safeUrl(location, current)
      if (!current) break
      continue
    }
    return {
      requestedUrl: canonicalUrl(input), finalUrl: current, redirectChain: chain,
      status: response.status, contentType: (response.headers.get('content-type') || '').split(';')[0].toLowerCase(),
      byteSize: data.byteLength, sha256: sha256(data), data
    }
  }
  throw new Error(`Redirect chain exceeded limit for ${input}`)
}

const wixBaseUrl = process.env.PHASE9_WIX_BASE_URL ? canonicalUrl(process.env.PHASE9_WIX_BASE_URL) : null
if (!wixBaseUrl) throw new Error('PHASE9_WIX_BASE_URL is required for authoritative Phase 9 discovery.')
const wixOrigin = new URL(wixBaseUrl).origin
const wixCache = join(cacheDir, 'wix')
const pageCache = join(wixCache, 'pages')
const downloadCache = join(wixCache, 'assets')
await mkdir(pageCache, { recursive: true })
await mkdir(downloadCache, { recursive: true })
let previousAssets = []
try { previousAssets = (await readJson('migration/phase9/source-snapshot.json')).wix?.assets || [] } catch {}
const previousAssetMap = new Map(previousAssets.filter((item) => item.safe && item.cacheName).map((item) => [item.sourceUrl, item]))

const probes = []
const probeUrls = [wixBaseUrl, `${wixBaseUrl}/`, `${wixBaseUrl}/robots.txt`, `${wixBaseUrl}/sitemap.xml`, `${wixOrigin}/robots.txt`, `${wixOrigin}/sitemap.xml`]
for (const url of [...new Set(probeUrls)]) {
  const result = await fetchWithEvidence(url)
  probes.push({ ...result, data: undefined })
}
const homeFetch = await fetchWithEvidence(wixBaseUrl)
if (homeFetch.status !== 200 || homeFetch.contentType !== 'text/html') throw new Error(`Wix homepage is not publicly readable: ${homeFetch.status} ${homeFetch.contentType}`)
const homeHtml = new TextDecoder().decode(homeFetch.data)
const viewerModel = extractViewerModel(homeHtml)
const router = viewerModel?.siteFeaturesConfigs?.router
if (!router?.pagesMap || !router?.routes) throw new Error('Wix public router metadata was not found in initial HTML.')

const routeEntries = Object.entries(router.routes)
  .map(([route, value]) => ({ path: route === './' ? '' : route.replace(/^\.\//, ''), pageId: value.pageId, routeType: value.type }))
  .sort((a, b) => a.path.localeCompare(b.path, 'zh-Hant'))
const pages = []
for (const route of routeEntries) {
  const url = route.path ? `${wixBaseUrl}/${encodeURI(route.path)}` : wixBaseUrl
  const fetched = route.path ? await fetchWithEvidence(url) : homeFetch
  const html = new TextDecoder().decode(fetched.data)
  await writeFile(join(pageCache, `${sha256(canonicalUrl(url))}.html`), html)
  const pageMeta = router.pagesMap[route.pageId] || {}
  const visibleText = htmlToText(html)
  const links = extractLinks(html, url)
  const images = extractImages(html, url)
  const files = links.filter((item) => /\.filesusr\.com\/|\.(?:pdf|docx?|xlsx?|pptx?|txt)(?:$|\?)/i.test(item.url))
  const videos = links.filter((item) => /(?:youtube\.com|youtu\.be|vimeo\.com)/i.test(item.url))
  pages.push({
    pageId: route.pageId, routeType: route.routeType, path: route.path ? `/${route.path}` : '/',
    requestedUrl: canonicalUrl(url), finalUrl: fetched.finalUrl, canonicalUrl: extractCanonical(html, fetched.finalUrl),
    status: fetched.status, contentType: fetched.contentType, byteSize: fetched.byteSize, sha256: fetched.sha256,
    fetchedAt: snapshotAt, title: pageMeta.title || extractTitle(html), documentTitle: extractTitle(html),
    pageUriSeo: pageMeta.pageUriSEO || route.path, pageJsonFileName: pageMeta.pageJsonFileName || null,
    language: viewerModel.language?.userLanguage || 'en', text: contentText(visibleText), links, images, files, videos
  })
}

const assetRefs = new Map()
for (const page of pages) {
  for (const image of page.images) {
    const current = assetRefs.get(image.url) || { sourceUrl: image.url, kind: 'image', parents: [], labels: [], downloadUrls: [] }
    current.parents.push(page.path)
    if (image.alt) current.labels.push(image.alt)
    current.downloadUrls.push(...(image.downloadUrls || []))
    assetRefs.set(image.url, current)
  }
  for (const file of page.files) {
    const current = assetRefs.get(file.url) || { sourceUrl: file.url, kind: 'attachment', parents: [], labels: [] }
    current.parents.push(page.path)
    if (file.text) current.labels.push(file.text)
    assetRefs.set(file.url, current)
  }
}

const mimeExtensions = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'application/pdf': 'pdf', 'text/plain': 'txt',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx'
}
const ascii = (data, start, end) => String.fromCharCode(...data.slice(start, end))
const begins = (data, bytes) => bytes.every((byte, index) => data[index] === byte)
const sniffMime = (data) => {
  if (data[0] === 0xff && data[1] === 0xd8) return 'image/jpeg'
  if (begins(data, [137, 80, 78, 71, 13, 10, 26, 10])) return 'image/png'
  if (ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 12) === 'WEBP') return 'image/webp'
  if (['GIF87a', 'GIF89a'].includes(ascii(data, 0, 6))) return 'image/gif'
  if (ascii(data, 0, 5) === '%PDF-') return 'application/pdf'
  if (begins(data, [0x50, 0x4b])) return 'application/zip'
  return null
}
const ooxmlMimes = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])
const safeDerivativeUrl = (value) => {
  const url = new URL(value)
  url.pathname = url.pathname.replace(/,enc_avif(?:,quality_auto)?/g, '').replace(/,quality_auto/g, '')
  url.search = ''
  return url.toString()
}

const assets = []
for (const ref of [...assetRefs.values()].sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl))) {
  const previous = previousAssetMap.get(ref.sourceUrl)
  if (previous) {
    assets.push({ ...previous, parents: [...new Set(ref.parents)].sort(), labels: [...new Set(ref.labels)].filter(Boolean).sort() })
    continue
  }
  const original = await fetchWithEvidence(ref.sourceUrl)
  const originalSniff = sniffMime(original.data)
  const originalHeader = original.contentType
  let fetched = original
  let downloadUrl = ref.sourceUrl
  let sniffed = originalSniff === 'application/zip' && ooxmlMimes.has(originalHeader) ? originalHeader : originalSniff
  const limit = ref.kind === 'image' ? 10 * 1024 * 1024 : 20 * 1024 * 1024
  if (ref.kind === 'image' && original.byteSize > limit && ref.downloadUrls.length) {
    const candidate = safeDerivativeUrl(ref.downloadUrls.sort((a, b) => b.length - a.length)[0])
    fetched = await fetchWithEvidence(candidate)
    downloadUrl = candidate
    sniffed = sniffMime(fetched.data)
  }
  const headerMime = fetched.contentType
  const extension = mimeExtensions[sniffed] || extname(new URL(fetched.finalUrl).pathname).slice(1).toLowerCase()
  const allowed = Boolean(sniffed && mimeExtensions[sniffed] && (ref.kind === 'attachment' || sniffed.startsWith('image/')))
  const safe = fetched.status === 200 && allowed && fetched.byteSize > 0 && fetched.byteSize <= limit
  const cacheName = safe ? `${fetched.sha256}.${extension}` : null
  if (safe) await writeFile(join(downloadCache, cacheName), fetched.data)
  assets.push({
    sourceUrl: ref.sourceUrl, downloadUrl, finalUrl: fetched.finalUrl, status: fetched.status, contentType: headerMime,
    detectedMimeType: sniffed, extension, byteSize: fetched.byteSize, sha256: fetched.sha256,
    originalContentType: originalHeader, originalDetectedMimeType: originalSniff, originalByteSize: original.byteSize, originalSha256: original.sha256,
    fetchedAt: snapshotAt, kind: ref.kind, parents: [...new Set(ref.parents)].sort(),
    labels: [...new Set(ref.labels)].filter(Boolean).sort(), safe, rejectionReason: safe ? null : 'status_mime_extension_signature_or_size_validation_failed', cacheName
  })
}

const remote = { available: false, tables: {}, records: {}, legacyUrls: [], storage: {}, settingsBackup: null }
const url = process.env.NUXT_PUBLIC_SUPABASE_URL
const key = process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY
const email = process.env.PHASE9_ADMIN_EMAIL || process.env.PHASE8_ADMIN_EMAIL || process.env.PHASE6_ADMIN_EMAIL
const password = process.env.PHASE9_ADMIN_PASSWORD || process.env.PHASE8_ADMIN_PASSWORD || process.env.PHASE6_ADMIN_PASSWORD

const listBucket = async (client, bucket) => {
  const objects = []
  const pending = ['']
  while (pending.length) {
    const prefix = pending.shift()
    const { data, error } = await client.storage.from(bucket).list(prefix, { limit: 1000 })
    if (error) return { accessible: false, count: null, objects: [] }
    for (const item of data) {
      const path = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id) objects.push({ path, id: item.id, updatedAt: item.updated_at, metadata: item.metadata || null })
      else pending.push(path)
    }
  }
  return { accessible: true, count: objects.length, objects }
}

if ([url, key, email, password].every(Boolean)) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`Active-admin source inspection failed: ${signInError.message}`)
  remote.available = true
  for (const table of ['activities', 'activity_assets', 'activity_videos', 'posts', 'files', 'faq', 'year_summaries', 'site_settings']) {
    const { data, error, count } = await client.from(table).select('*', { count: 'exact' })
    if (error) throw new Error(`Cannot inspect ${table}: ${error.message}`)
    remote.tables[table] = count ?? data.length
    remote.records[table] = data.map((row) => ({
      id: row.id, title: row.title ?? row.question ?? row.site_name ?? null, slug: row.slug ?? null,
      status: row.status ?? null, academicYear: row.academic_year ?? null,
      updatedAt: row.updated_at ?? row.created_at ?? null, sourceHash: sha256(row)
    }))
    for (const row of data) for (const field of ['file_url', 'image_url']) if (typeof row[field] === 'string' && row[field]) remote.legacyUrls.push({ table, id: row.id, field, url: canonicalUrl(row[field]) })
    if (table === 'site_settings' && data[0]) {
      const row = data[0]
      remote.settingsBackup = {
        id: row.id, siteName: row.site_name ?? '', clubNameZh: row.club_name_zh ?? '', clubNameEn: row.club_name_en ?? '',
        slogan: row.slogan ?? '', heroTitle: row.hero_title ?? '', heroSubtitle: row.hero_subtitle ?? '', aboutSummary: row.about_summary ?? '',
        facebookUrl: row.facebook_url ?? '', instagramUrl: row.instagram_url ?? '', youtubeUrl: row.youtube_url ?? '',
        contactText: row.contact_text ?? '', email: row.email ?? '', phone: row.phone ?? '', locations: row.map_locations ?? [],
        defaultSeoTitle: row.default_seo_title ?? '', defaultSeoDescription: row.default_seo_description ?? '', footerText: row.footer_text ?? '', updatedAt: row.updated_at
      }
    }
  }
  for (const bucket of ['activity-assets', 'content-assets', 'downloads', 'activity-images', 'public-files']) remote.storage[bucket] = await listBucket(client, bucket)
  await client.auth.signOut({ scope: 'local' })
}

const mocks = {
  counts: { activities: mockActivities.length, posts: mockPosts.length, files: mockFiles.length, faq: mockFaq.length, years: mockYearSummaries.length, programs: mockPrograms.length, settings: 1 },
  sourceHash: sha256({ mockActivities, mockPosts, mockFiles, mockFaq, mockYearSummaries, mockPrograms, siteSettings })
}

const wix = {
  baseUrl: wixBaseUrl, canonicalUrl: extractCanonical(homeHtml, homeFetch.finalUrl), homepageStatus: homeFetch.status,
  homepageRedirectChain: homeFetch.redirectChain, robots: probes.filter((item) => item.requestedUrl.endsWith('/robots.txt')),
  sitemaps: probes.filter((item) => item.requestedUrl.endsWith('/sitemap.xml')), viewerModelSha256: sha256(JSON.stringify(viewerModel)),
  routeCount: pages.length, pageCount: pages.filter((page) => page.status === 200).length, assetCount: assets.length,
  safeAssetCount: assets.filter((asset) => asset.safe).length, pages, assets, exportAvailable: false, blocker: null
}
const snapshotBody = { schemaVersion: 2, recordedAt: snapshotAt, appCommitSha: await appCommit(), wix, publicDiscovery, staticPages: staticFiles, mocks, remote }
assertNoSensitiveMaterial(JSON.stringify(snapshotBody), 'source snapshot')
const snapshotSha256 = sha256(snapshotBody)
const snapshot = { ...snapshotBody, snapshotSha256 }
await writeJson('migration/phase9/source-snapshot.json', snapshot)
await writeJson('migration/phase9/backups/site-settings-before.json', remote.settingsBackup ?? {})
await writeJson('.phase9-cache/wix-source-cache-index.json', { snapshotAt, baseUrl: wixBaseUrl, pages: pages.map(({ path, sha256, status }) => ({ path, sha256, status })), assets })
console.log(JSON.stringify({ snapshotSha256, canonicalUrl: wix.canonicalUrl, pages: wix.pageCount, assets: wix.assetCount, safeAssets: wix.safeAssetCount, remoteTables: remote.tables }, null, 2))
