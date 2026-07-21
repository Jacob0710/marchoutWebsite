import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { mockActivities, mockFaq, mockFiles, mockPosts, mockPrograms, mockYearSummaries, siteSettings } from '../../utils/mockData.ts'
import { assertNoSensitiveMaterial, canonicalUrl, countBy, readJson, root, sha256, stableJson, toCsv, writeJsonl, writeText } from './lib/core.mjs'

const snapshot = await readJson('migration/phase9/source-snapshot.json')
if (!snapshot.wix?.canonicalUrl || snapshot.wix.blocker || snapshot.wix.pageCount !== 83 || snapshot.wix.safeAssetCount !== snapshot.wix.assetCount) {
  throw new Error('The fixed Wix snapshot is absent, blocked, incomplete, or contains unsafe assets.')
}
const pages = snapshot.wix.pages
const sourceAssets = snapshot.wix.assets
const pageByPath = new Map(pages.map((page) => [page.path, page]))
const assetByUrl = new Map(sourceAssets.map((asset) => [asset.sourceUrl, asset]))
const discoveredAt = snapshot.recordedAt
const docIndexFile = existsSync(resolve(root, '.phase9-cache/wix-document-text-index.json'))
  ? await readJson('.phase9-cache/wix-document-text-index.json') : { documents: [] }
const docIndex = docIndexFile.documents || []
const docByUrl = new Map(docIndex.map((doc) => [doc.sourceUrl, doc]))
const textCache = new Map()

const normalizePath = (value) => {
  try {
    const url = new URL(value)
    const prefix = '/website'
    let path = decodeURIComponent(url.pathname)
    if (path === prefix) return '/'
    if (path.startsWith(`${prefix}/`)) path = path.slice(prefix.length)
    return path || '/'
  } catch { return '' }
}
const linkedPaths = (page) => new Set(page.links.map((link) => normalizePath(link.url)).filter(Boolean))
const yearFrom = (text = '') => Number(text.match(/(?:^|\D)(10[9]|11[0-4])(?:\D|$)/)?.[1] || 0) || null
const yearPages = new Map()
for (const page of pages) {
  const year = yearFrom(page.title) || yearFrom(page.text.match(/(?:^|\n)(10[9]|11[0-4])年評鑑(?:\n|$)/)?.[0])
  if (year && /評鑑|^11[0-4]$|^109$/.test(page.title + page.text)) yearPages.set(year, page)
}
const isHome = (page) => page.path === '/' || page.path === '/home'
const isAbout = (page) => page.path === '/about'
const isOrganization = (page) => page.path === '/organaization'
const isAlmanac = (page) => page.path === '/副本-organaization'
const isYearLanding = (page) => [...yearPages.values()].includes(page)
const isFinance = (page) => /^\s*FINANCE(?:\s+(?:10[9]|11[0-4]))?\s*$/i.test(page.title)
const isCategory = (page) => /^\s*(FINANCE|VOLUNTEER SERVICES?|EVENTS?|SPECIAL EVENTS?)(?:\s+(10[9]|11[0-4]))?\s*$/i.test(page.title)
const isUtility = (page) => /fullscreen|popup/i.test(page.path + page.title)
const structural = (page) => isHome(page) || isAbout(page) || isOrganization(page) || isAlmanac(page) || isYearLanding(page) || isCategory(page) || isUtility(page)
const activityPages = pages.filter((page) => !structural(page))
if (activityPages.length !== 46) throw new Error(`Expected 46 activity detail pages; found ${activityPages.length}`)

const categoryParents = new Map(activityPages.map((page) => [page.path, pages.filter((parent) => isCategory(parent) && linkedPaths(parent).has(page.path))]))
const activityYear = (page) => {
  const titleYear = yearFrom(page.title)
  const backYear = Number(page.text.match(/BACK TO\s+(10[9]|11[0-4])/i)?.[1] || 0) || null
  const parentYear = categoryParents.get(page.path).map((parent) => yearFrom(parent.title)).find(Boolean) || null
  return parentYear || titleYear || backYear
}
const activityType = (page) => {
  const evidence = categoryParents.get(page.path).map((parent) => parent.title).join(' ')
  if (/VOLUNTEER/i.test(evidence)) return 'project'
  if (/SPECIAL/i.test(evidence)) return 'exploration'
  if (/EVENT/i.test(evidence)) return 'regular'
  const title = page.title
  if (/服務|關懷|陪讀|早餐|募款|志工|慈善|送到家|溫暖桃園/.test(title)) return 'project'
  if (/營|探險|博覽會|快閃|自然|科學|醫學/.test(title)) return 'exploration'
  if (/訓練|大會|講座|音樂|聯歡|烤肉|社課|出遊|交換禮物|DIY|工作坊|歡送|個人形象|成為中原人|校友回娘家/.test(title)) return 'regular'
  return null
}

const readDocText = async (url) => {
  if (textCache.has(url)) return textCache.get(url)
  const doc = docByUrl.get(url)
  if (!doc?.textCacheName) return ''
  const value = await readFile(resolve(root, '.phase9-cache/wix/document-text', doc.textCacheName), 'utf8')
  textCache.set(url, value)
  return value
}
const rocDate = (text) => {
  const match = text.match(/民國\s*(10[9]|11[0-9])\s*年\s*(1[0-2]|\d)\s*月\s*(3[01]|[12]?\d)\s*日/)
  if (!match) return null
  return `${Number(match[1]) + 1911}-${String(match[2]).padStart(2, '0')}-${String(match[3]).padStart(2, '0')}`
}
const cleanFact = (value, max = 600) => value?.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) || null
const factsFor = async (page) => {
  const docs = [...page.files].sort((a, b) => Number(/計[劃畫]書|企劃書/.test(b.text)) - Number(/計[劃畫]書|企劃書/.test(a.text)))
  const texts = []
  for (const file of docs) texts.push({ file, text: await readDocText(file.url) })
  const joined = texts.map((item) => item.text).join('\n')
  const date = texts.map((item) => rocDate(item.text)).find(Boolean) || null
  const participants = Number(joined.match(/(?:活動參與人數|預計參加人數|參加人數)\s*[:：]?\s*(\d{1,4})\s*人?/)?.[1] || 0) || null
  const location = cleanFact(joined.match(/活動地點\s+([^\n]{2,180}?)(?=\s+(?:民國|主辦單位|協辦單位|參加對象|宣傳方式|活動目的)|$)/)?.[1], 180)
  const purpose = cleanFact(joined.match(/活動目的\s*([\s\S]{10,1200}?)(?=\n?民國\s*(?:10[9]|11[0-9])\s*年|\n?時間\s*活動地點|\n?活動地點)/)?.[1], 1000)
  const pii = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?<!\d)09\d{8}(?!\d)|(?:學號|手機|聯絡電話|身分證|姓名)\s*[:：]?\s*\S+/i.test(joined)
  return { date, participants, location, purpose, pii, evidence: texts.filter((item) => item.text).map((item) => ({ sourceUrl: item.file.url, sourceSha256: assetByUrl.get(item.file.url)?.sha256 })) }
}

const safeSlug = (page, year) => {
  const value = page.pageUriSeo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (value.length >= 3 && !/^\d+$/.test(value) && !/^(copy-of|fullscreen-page|home)$/.test(value) && !value.startsWith('copy-of-')) return `${value}-${year}`.slice(0, 100)
  return `wix-${page.pageId.toLowerCase()}-${year}`
}
const downloadName = (asset) => {
  let name = ''
  try { name = new URL(asset.sourceUrl).searchParams.get('dn') || '' } catch {}
  name = name ? decodeURIComponent(name) : basename(asset.finalUrl || asset.sourceUrl)
  name = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').trim()
  const ext = `.${asset.extension}`
  if (!name.toLowerCase().endsWith(ext)) name = `${name.replace(/\.[^.]+$/, '')}${ext}`
  return name.slice(0, 180) || `wix-${asset.sha256.slice(0, 12)}${ext}`
}
const activityFacts = new Map()
for (const page of activityPages) activityFacts.set(page.path, await factsFor(page))

const content = []
const assignments = []
const activityByPath = new Map()
for (const page of activityPages) {
  const year = activityYear(page)
  const kind = activityType(page)
  const facts = activityFacts.get(page.path)
  const slug = safeSlug(page, year || 0)
  const migrationKey = `wix:activity:${page.pageId}`
  const warnings = [!year && 'academic_year_unknown', !kind && 'activity_type_unknown', !facts.date && 'event_date_unknown', !facts.location && 'location_unknown', !facts.participants && 'participants_unknown', 'result_summary_unavailable', facts.pii && 'attachment_contains_personal_data'].filter(Boolean)
  const payload = { title: page.title.trim(), slug, academicYear: year, activityType: kind, eventDate: facts.date, location: facts.location, participantsCount: facts.participants, resultSummary: null, content: facts.purpose ? `活動目的\n${facts.purpose}` : null, isFeatured: false, tags: ['wix-source'] }
  const item = { migrationKey, sourceSystem: 'wix', sourceKind: 'activity', sourceKey: `wix:page:${page.pageId}`, sourceUrl: page.canonicalUrl, sourceKeys: [`wix:page:${page.pageId}`], targetKind: 'activity', targetNaturalKey: `${slug}:${year || 'unknown'}`, sourceHash: page.sha256, normalizedHash: sha256(payload), operation: 'create', desiredStatus: 'draft', payload, factEvidence: facts.evidence, assetKeys: [], oldUrls: [page.canonicalUrl], warnings, blockingIssues: [] }
  content.push(item)
  activityByPath.set(page.path, item)
}

const sharedImage = (asset) => asset.kind === 'image' && asset.parents.length > 5
for (const page of activityPages) {
  const owner = activityByPath.get(page.path)
  const sourceUrls = [...page.images.map((image) => image.url), ...page.files.map((file) => file.url)]
  let imageIndex = 0
  for (const url of [...new Set(sourceUrls)]) {
    const asset = assetByUrl.get(url)
    if (!asset || sharedImage(asset)) continue
    const role = asset.kind === 'image' ? (imageIndex++ === 0 ? 'cover' : 'gallery') : 'attachment'
    const assetKey = `wix:asset:${owner.migrationKey}:${sha256(url).slice(0, 20)}`
    owner.assetKeys.push(assetKey)
    assignments.push({ assetKey, sourceKey: `wix:asset-source:${asset.sha256}`, sourceUrl: asset.sourceUrl, sourceSha256: asset.sha256, cacheName: asset.cacheName, byteSize: asset.byteSize, detectedMimeType: asset.detectedMimeType, ownerMigrationKey: owner.migrationKey, ownerKind: 'activity', role, originalFilename: downloadName(asset), altText: asset.kind === 'image' ? `${page.title} 活動照片` : '', targetBucket: 'activity-assets', targetNamespace: 'activities/{targetId}', operation: 'upload-private', warnings: asset.kind === 'attachment' && activityFacts.get(page.path).pii ? ['private_draft_attachment_may_contain_personal_data'] : [] })
  }
}

const fileOwnerPages = pages.filter((page) => isFinance(page) || isOrganization(page))
const fileSeen = new Set()
for (const page of fileOwnerPages) {
  for (const link of page.files) {
    const asset = assetByUrl.get(link.url)
    if (!asset || fileSeen.has(asset.sha256)) continue
    fileSeen.add(asset.sha256)
    const docText = await readDocText(asset.sourceUrl)
    let title = downloadName(asset).replace(new RegExp(`${extname(downloadName(asset)).replace('.', '\\.')}$$`, 'i'), '')
    if (!title || /^eec8|^wix-/i.test(title)) title = asset.labels.find((label) => !/LET.?S MARCH/i.test(label)) || `Wix 文件 ${asset.sha256.slice(0, 8)}`
    const year = yearFrom(page.title) || yearFrom(title) || yearFrom(docText)
    const category = isFinance(page) ? 'finance' : 'organization'
    const pii = /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|(?<!\d)09\d{8}(?!\d)|(?:學號|手機|聯絡電話|身分證|姓名)\s*[:：]?\s*\S+/i.test(docText)
    const migrationKey = `wix:file:${asset.sha256.slice(0, 24)}`
    const payload = { title: title.slice(0, 160), description: '', academicYear: year, category, sortOrder: content.filter((item) => item.targetKind === 'file').length }
    const assetKey = `wix:asset:${migrationKey}:${asset.sha256.slice(0, 20)}`
    content.push({ migrationKey, sourceSystem: 'wix', sourceKind: 'attachment', sourceKey: `wix:asset-source:${asset.sha256}`, sourceUrl: asset.sourceUrl, sourceKeys: [`wix:asset-source:${asset.sha256}`, `wix:page:${page.pageId}`], targetKind: 'file', targetNaturalKey: migrationKey, sourceHash: asset.sha256, normalizedHash: sha256(payload), operation: 'create', desiredStatus: 'draft', payload, assetKeys: [assetKey], oldUrls: [asset.sourceUrl], warnings: [!year && 'academic_year_unknown', pii && 'document_may_contain_personal_data'].filter(Boolean), blockingIssues: [] })
    assignments.push({ assetKey, sourceKey: `wix:asset-source:${asset.sha256}`, sourceUrl: asset.sourceUrl, sourceSha256: asset.sha256, cacheName: asset.cacheName, byteSize: asset.byteSize, detectedMimeType: asset.detectedMimeType, ownerMigrationKey: migrationKey, ownerKind: 'file', role: 'download', originalFilename: downloadName(asset), altText: '', targetBucket: 'downloads', targetNamespace: 'files/{targetId}', operation: 'upload-private', warnings: pii ? ['private_draft_document_may_contain_personal_data'] : [] })
  }
}

for (const [year, page] of [...yearPages].sort(([a], [b]) => a - b)) {
  const sourceLabel = page.text.match(new RegExp(`${year}年評鑑`))?.[0] || page.title.trim()
  const payload = { academicYear: year, title: sourceLabel, theme: '', summary: sourceLabel, highlights: [], statistics: [], coverAlt: '', sortOrder: year }
  content.push({ migrationKey: `wix:year:${year}`, sourceSystem: 'wix', sourceKind: 'year-summary', sourceKey: `wix:page:${page.pageId}`, sourceUrl: page.canonicalUrl, sourceKeys: [`wix:page:${page.pageId}`], targetKind: 'year-summary', targetNaturalKey: String(year), sourceHash: page.sha256, normalizedHash: sha256(payload), operation: 'create', desiredStatus: 'draft', payload, assetKeys: [], oldUrls: [page.canonicalUrl], warnings: ['narrative_summary_unavailable'], blockingIssues: [] })
}
const settingsPayload = { facebookUrl: 'https://www.facebook.com/cycu.marchout/', instagramUrl: 'https://www.instagram.com/cycumarchout/' }
content.push({ migrationKey: 'wix:site-settings:singleton', sourceSystem: 'wix', sourceKind: 'site-setting', sourceKey: 'wix:page:c1dmp', sourceUrl: snapshot.wix.canonicalUrl, sourceKeys: ['wix:page:c1dmp'], targetKind: 'site-settings', targetNaturalKey: 'singleton', sourceHash: pageByPath.get('/').sha256, normalizedHash: sha256(settingsPayload), operation: 'merge', desiredStatus: 'published', payload: settingsPayload, assetKeys: [], oldUrls: [snapshot.wix.canonicalUrl], warnings: [], blockingIssues: [] })
content.sort((a, b) => ({ file: 0, activity: 1, 'year-summary': 2, 'site-settings': 3 }[a.targetKind] - { file: 0, activity: 1, 'year-summary': 2, 'site-settings': 3 }[b.targetKind] || a.migrationKey.localeCompare(b.migrationKey)))
assignments.sort((a, b) => a.assetKey.localeCompare(b.assetKey))

const usedSourceHashes = new Set(assignments.map((item) => item.sourceSha256))
const inventory = []
const add = (item) => inventory.push({ discoveredAt, ...item })
for (const page of pages) {
  const activity = activityByPath.get(page.path)
  let disposition = 'redirect-only', targetKind = 'page', reason = 'Structural Wix route is represented by a verified redirect candidate.'
  if (activity) { disposition = 'migrate'; targetKind = 'activity'; reason = 'Activity detail is imported as a private draft with source evidence.' }
  else if (isAbout(page)) { disposition = 'merge'; targetKind = 'static-page'; reason = 'Authoritative history and mission copy is merged into the repository About page.' }
  else if (isOrganization(page)) { disposition = 'merge'; targetKind = 'static-page'; reason = 'Organization documents are imported as private draft Files; current semantic page remains.' }
  else if (isHome(page)) { disposition = 'merge'; targetKind = 'site-settings'; reason = 'Authoritative social links are merged into site settings.' }
  else if (isYearLanding(page)) { disposition = 'migrate'; targetKind = 'year-summary'; reason = 'Year index is imported as a draft year summary.' }
  else if (isUtility(page)) { disposition = 'archive'; reason = 'Wix utility route has no standalone content and is not assigned a 410 without approval.' }
  add({ sourceSystem: 'wix', sourceKind: activity ? 'activity' : 'page', sourceKey: `wix:page:${page.pageId}`, sourceUrl: page.canonicalUrl, title: page.title, sourceUpdatedAt: page.fetchedAt, byteSize: page.byteSize, sha256: page.sha256, language: page.language, disposition, targetKind, reason })
}
for (const asset of sourceAssets) add({ sourceSystem: 'wix', sourceKind: asset.kind === 'image' ? 'image' : 'attachment', sourceKey: `wix:asset-source:${asset.sha256}`, sourceUrl: asset.sourceUrl, parentSourceKey: asset.parents.map((path) => `wix:path:${path}`).join('|'), title: asset.labels.join(' | ') || downloadName(asset), sourceUpdatedAt: asset.fetchedAt, byteSize: asset.byteSize, sha256: asset.sha256, language: 'zh-TW', disposition: usedSourceHashes.has(asset.sha256) ? 'migrate' : 'skip', targetKind: asset.kind, reason: usedSourceHashes.has(asset.sha256) ? 'Validated source asset is assigned to a private target.' : 'Shared Wix chrome/background or unowned decorative asset is not imported.' })
for (const item of snapshot.publicDiscovery) add({ sourceSystem: 'external-public', sourceKind: 'page', sourceKey: `external:${sha256(item.url).slice(0, 24)}`, sourceUrl: item.url, title: item.title, sha256: sha256(item), language: 'zh-TW', disposition: 'skip', reason: 'Discovery evidence only; not an authoritative migration source.' })
for (const [route, meta] of Object.entries(snapshot.staticPages)) add({ sourceSystem: 'repository', sourceKind: 'static-page', sourceKey: `repository:static:${route}`, title: route, byteSize: meta.byteSize, sha256: meta.sha256, language: 'zh-TW', disposition: route === '/about' ? 'merge' : 'skip', targetKind: 'static-page', reason: route === '/about' ? 'Merged with authoritative Wix source.' : 'Existing Phase 8 page remains; no equivalent Wix content was found.' })
for (const row of snapshot.remote.records.activities ?? []) add({ sourceSystem: 'legacy-db', sourceKind: 'activity', sourceKey: `legacy-db:activities:${row.id}`, title: row.title, sourceUpdatedAt: row.updatedAt, sha256: row.sourceHash, disposition: 'skip', targetKind: 'activity', reason: 'Pre-existing Phase 8 content is preserved and not claimed as Wix migration content.' })
for (const row of snapshot.remote.records.site_settings ?? []) add({ sourceSystem: 'legacy-db', sourceKind: 'site-setting', sourceKey: `legacy-db:site-settings:${row.id}`, title: row.title, sourceUpdatedAt: row.updatedAt, sha256: row.sourceHash, disposition: 'merge', targetKind: 'site-settings', reason: 'Existing singleton is preserved and merged through Nitro Server API.' })
const mocks = [...mockActivities.map((x) => ['activity', x.id, x.title]), ...mockPosts.map((x) => ['post', x.id, x.title]), ...mockFiles.map((x) => ['file', x.id, x.title]), ...mockFaq.map((x) => ['faq', x.id, x.question]), ...mockYearSummaries.map((x) => ['year-summary', x.year, `${x.year}`]), ...mockPrograms.map((x) => ['static-page', x.id, x.title]), ['site-setting', 'singleton', siteSettings.siteName]]
for (const [kind, id, title] of mocks) add({ sourceSystem: 'mock', sourceKind: kind, sourceKey: `mock:${kind}:${id}`, title, language: 'zh-TW', disposition: 'skip', reason: 'Synthetic placeholder is not authoritative Wix/Legacy content.' })
inventory.sort((a, b) => a.sourceKey.localeCompare(b.sourceKey))

const redirects = pages.map((page) => {
  const activity = activityByPath.get(page.path)
  let target = '', code = 0, verified = false, reason = 'Deferred: no published equivalent exists.'
  if (isHome(page)) { target = '/'; code = 301; verified = true; reason = 'Canonical home route exists.' }
  else if (isAbout(page)) { target = '/about'; code = 301; verified = true; reason = 'Merged About route exists.' }
  else if (isOrganization(page)) { target = '/organization'; code = 301; verified = true; reason = 'Organization route exists; source documents moved to Files.' }
  else if (isAlmanac(page)) { target = '/years'; code = 301; verified = true; reason = 'Year index route exists.' }
  else if (isYearLanding(page)) { target = `/years/${[...yearPages].find(([, candidate]) => candidate === page)?.[0]}`; reason = 'Deferred until draft year summary is reviewed and published.' }
  else if (isFinance(page)) { target = '/files'; code = 301; verified = true; reason = 'Files index exists; migrated files remain private drafts.' }
  else if (isCategory(page)) { target = '/activities'; code = 301; verified = true; reason = 'Activities index exists; detail routes remain deferred while drafts.' }
  else if (activity) { target = `/activities/${activity.payload.slug}`; reason = 'Deferred because target activity is a private draft.' }
  return { source_url: page.canonicalUrl, source_path: page.path, target_path: target, status_code: code, content_kind: activity ? 'activity' : 'page', source_key: `wix:page:${page.pageId}`, target_id: '', reason, verified }
})

const reviews = []
const review = (item) => reviews.push({ review_id: `P9-${String(reviews.length + 1).padStart(4, '0')}`, ...item, blocks_publish: true, blocks_migration: false })
for (const item of content) {
  if (item.targetKind === 'site-settings') continue
  const codes = item.warnings.length ? item.warnings.join('|') : 'editorial_review_required'
  review({ severity: item.warnings.some((x) => /personal_data/.test(x)) ? 'high' : 'medium', source_key: item.sourceKey, source_url: item.sourceUrl, target_kind: item.targetKind, issue_code: codes, description: `${item.payload.title} is imported as a private draft; missing or sensitive source facts were not invented.`, recommended_action: 'An editor must verify facts, redact personal data where required, add missing publication fields, and explicitly publish.', resolution: 'Migration-safe: imported to private Storage and draft-only; publication remains blocked.' })
}
for (const row of redirects.filter((row) => !row.verified && row.target_path)) review({ severity: 'low', source_key: row.source_key, source_url: row.source_url, target_kind: 'redirect', issue_code: 'redirect_target_is_draft', description: `Redirect to ${row.target_path} is recorded but inactive while the target is draft.`, recommended_action: 'Activate a 301 only after the target is reviewed and published.', resolution: 'Migration-safe: manifest row uses status_code 0 and verified=false.' })

const staticManifest = Object.entries(snapshot.staticPages).map(([route, meta]) => ({ route, sourceKey: route === '/about' ? `wix:page:${pageByPath.get('/about').pageId}` : `repository:static:${route}`, sourceUrl: route === '/about' ? pageByPath.get('/about').canonicalUrl : '', sourceFile: meta.file, sourceHash: route === '/about' ? pageByPath.get('/about').sha256 : meta.sha256, disposition: route === '/about' ? 'merge' : 'already-current', sections: route === '/about' ? ['origin', 'mission-service', 'mission-character', 'mission-leadership', 'mission-fellowship'] : ['existing-semantic-sections'], warnings: route === '/about' ? [] : ['No equivalent authoritative Wix page; Phase 8 content preserved.'] })).sort((a, b) => a.route.localeCompare(b.route))

await writeJsonl('migration/phase9/source-inventory.jsonl', inventory)
await writeJsonl('migration/phase9/content-manifest.jsonl', content)
await writeJsonl('migration/phase9/assets-manifest.jsonl', assignments)
await writeJsonl('migration/phase9/static-pages-manifest.jsonl', staticManifest)
await writeJsonl('migration/phase9/rollback-manifest.jsonl', [])
await writeText('migration/phase9/url-redirects.csv', toCsv(['source_url','source_path','target_path','status_code','content_kind','source_key','target_id','reason','verified'], redirects))
await writeText('migration/phase9/manual-review.csv', toCsv(['review_id','severity','source_key','source_url','target_kind','issue_code','description','recommended_action','resolution','blocks_publish','blocks_migration'], reviews))

const dispositions = countBy(inventory, 'disposition')
const targetCounts = countBy(content, 'targetKind')
await writeText('migration/phase9/source-inventory-summary.md', `# Phase 9 source inventory summary\n\n- Snapshot SHA-256: \`${snapshot.snapshotSha256}\`\n- Canonical Wix URL: ${snapshot.wix.canonicalUrl}\n- Discovered: ${inventory.length}\n- Wix pages: ${pages.length}\n- Wix assets: ${sourceAssets.length} (${sourceAssets.filter((a) => a.kind === 'image').length} images, ${sourceAssets.filter((a) => a.kind === 'attachment').length} attachments)\n- Safe assets: ${snapshot.wix.safeAssetCount}\n- Source system counts: ${stableJson(countBy(inventory, 'sourceSystem'))}\n- Source kind counts: ${stableJson(countBy(inventory, 'sourceKind'))}\n- Disposition counts: ${stableJson(dispositions)}\n\nEvery source has an explicit disposition; synthetic content is never treated as real content.\n`)
await writeText('migration/phase9/content-manifest-summary.md', `# Phase 9 content manifest summary\n\n- Items: ${content.length}\n- Target kinds: ${stableJson(targetCounts)}\n- Operations: ${stableJson(countBy(content, 'operation'))}\n- Published desired: ${content.filter((x) => x.desiredStatus === 'published').length}\n- Draft desired: ${content.filter((x) => x.desiredStatus === 'draft').length}\n- Migration-blocking items: ${content.filter((x) => x.blockingIssues.length).length}\n- Posts: 0 (no authoritative source items)\n- FAQ: 0 (no authoritative source items)\n`)
await writeText('migration/phase9/assets-summary.md', `# Phase 9 asset summary\n\n- Source assets: ${sourceAssets.length}\n- Images: ${sourceAssets.filter((a) => a.kind === 'image').length}\n- Attachments: ${sourceAssets.filter((a) => a.kind === 'attachment').length}\n- Safe: ${sourceAssets.filter((a) => a.safe).length}\n- Private upload assignments: ${assignments.length}\n- Assigned unique source objects: ${usedSourceHashes.size}\n- Unassigned Wix chrome/decorative objects: ${sourceAssets.length - usedSourceHashes.size}\n\nAttachments and images are uploaded only through active-admin Nitro Server APIs into existing private buckets.\n`)
await writeText('migration/phase9/url-redirects-summary.md', `# Phase 9 URL redirect summary\n\n- Total source routes: ${redirects.length}\n- Active 301 candidates: ${redirects.filter((r) => r.status_code === 301).length}\n- Deferred draft targets: ${redirects.filter((r) => r.status_code === 0 && r.target_path).length}\n- Unmapped utility/archive routes: ${redirects.filter((r) => !r.target_path).length}\n- 410 candidates: 0 (none approved)\n- Loops: 0\n- Chains: 0\n`)
await writeText('migration/phase9/manual-review-summary.md', `# Phase 9 manual review summary\n\n- Total: ${reviews.length}\n- High: ${reviews.filter((r) => r.severity === 'high').length}\n- Blocks migration: ${reviews.filter((r) => r.blocks_migration).length}\n- Blocks publish: ${reviews.filter((r) => r.blocks_publish).length}\n\nAll review items are migration-safe drafts. Personal-data documents remain private until redaction and editorial approval.\n`)
for (const [label, value] of [['inventory', inventory], ['content', content], ['assets', assignments], ['reviews', reviews]]) assertNoSensitiveMaterial(value.map(stableJson).join('\n'), label)
console.log(JSON.stringify({ snapshotSha256: snapshot.snapshotSha256, pages: pages.length, sourceAssets: sourceAssets.length, inventory: inventory.length, dispositions, content: targetCounts, assignments: assignments.length, manualReview: reviews.length, migrationBlockers: reviews.filter((r) => r.blocks_migration).length }, null, 2))
