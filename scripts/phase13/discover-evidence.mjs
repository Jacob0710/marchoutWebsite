import { extname } from 'node:path'
import { fileSha256, fileSize, findSensitiveMaterial, readText, trackedFiles, writeJson, writeText } from './lib.mjs'

const evidencePattern = /^(?:migration\/phase(?:9|10)\/|outputs\/phase-(?:9|10|11|12)|outputs\/phase(?:9|10)-|codexSteps\/phase(?:9|10|11|12)\.md$|scripts\/phase(?:9|10|11|12)\/|docs\/(?:phase9|phase10|phase12|redirect)|supabase\/(?:migrations\/.*phase(?:9|10)|verify-phase(?:9|10))|types\/(?:phase9Migration|editorial)\.ts$|\.github\/workflows\/phase(?:11|12))/

const formatOf = path => ({ '.json': 'json', '.jsonl': 'jsonl', '.csv': 'csv', '.md': 'markdown', '.mjs': 'javascript-module', '.ts': 'typescript', '.sql': 'sql', '.yml': 'yaml' }[extname(path).toLowerCase()] || 'text')

const manifestTypeOf = path => {
  const name = path.toLowerCase()
  if (name.includes('source-inventory')) return 'source-inventory'
  if (name.includes('content-manifest')) return 'content-manifest'
  if (name.includes('assets-manifest') || name.includes('assets-summary')) return 'asset-manifest'
  if (name.includes('rollback-manifest')) return 'rollback-manifest'
  if (name.includes('manual-review') || name.includes('editorial-decisions')) return 'publication-review'
  if (name.includes('redirect')) return 'redirect-manifest'
  if (name.includes('source-snapshot')) return 'source-snapshot'
  if (name.includes('completion-report') || name.includes('complete-report')) return 'completion-report'
  if (name.includes('execution-status')) return 'execution-status'
  if (name.endsWith('.schema.json')) return 'schema'
  if (name.includes('/migrations/')) return 'migration-sql'
  if (name.includes('/verify-')) return 'verification'
  if (name.includes('/workflows/')) return 'ci-workflow'
  if (name.includes('/scripts/')) return 'reconciliation-or-operation-script'
  if (name.includes('/types/')) return 'type-model'
  if (name.includes('/codexsteps/')) return 'phase-specification'
  return 'documentation'
}

const sourcePhaseOf = path => path.match(/phase[-/]?(9|10|11|12)/i)?.[1] ? `phase-${path.match(/phase[-/]?(9|10|11|12)/i)[1]}` : 'cross-phase'

const authorityOf = path => {
  if (/^migration\/phase9\/(?:source-inventory\.jsonl|content-manifest\.jsonl|assets-manifest\.jsonl|rollback-manifest\.jsonl|static-pages-manifest\.jsonl|manual-review\.csv|url-redirects\.csv|source-snapshot\.json)$/.test(path)) return 'authoritative'
  if (/^migration\/phase10\/(?:editorial-decisions|redirect-decisions)\.json$/.test(path)) return 'authoritative'
  if (/^supabase\/(?:migrations|verify-phase)/.test(path)) return 'authoritative'
  if (/summary|redirect-config|release-manifest/.test(path)) return 'derived'
  return 'informational'
}

const schemaVersionOf = async (path, format) => {
  if (format === 'json') {
    try {
      const value = JSON.parse(await readText(path))
      return value.schemaVersion ?? (value.$schema ? 'json-schema' : 'unversioned')
    } catch { return 'unparseable' }
  }
  if (format === 'jsonl') {
    try {
      const first = (await readText(path)).split(/\r?\n/).find(Boolean)
      return JSON.parse(first).schemaVersion ?? 'phase9-unversioned'
    } catch { return 'unparseable' }
  }
  return 'not-applicable'
}

export const discoverEvidence = async () => {
  const files = trackedFiles().filter(path => evidencePattern.test(path))
  const entries = []
  for (const path of files) {
    const format = formatOf(path)
    const text = await readText(path)
    entries.push({
      manifestType: manifestTypeOf(path),
      path,
      format,
      schemaVersion: await schemaVersionOf(path, format),
      trackingStatus: 'tracked',
      sizeBytes: await fileSize(path),
      sha256: await fileSha256(path),
      sourcePhase: sourcePhaseOf(path),
      authorityLevel: authorityOf(path),
      containsSensitiveData: findSensitiveMaterial(text).length > 0
    })
  }
  entries.sort((a, b) => a.path.localeCompare(b.path))
  const result = {
    schemaVersion: 1,
    discoveryScope: 'tracked repository evidence from Phases 9-12; untracked local files are excluded from authority',
    deterministic: true,
    entries
  }
  const rows = entries.map(item => `| ${item.manifestType} | \`${item.path}\` | ${item.format} | ${item.schemaVersion} | ${item.trackingStatus} | ${item.sizeBytes} | \`${item.sha256}\` | ${item.sourcePhase} | ${item.authorityLevel} | ${item.containsSensitiveData} |`)
  const markdown = `# Phase 13 repository evidence index\n\n` +
    `This deterministic index covers tracked Phase 9–12 repository evidence only. Untracked local files are not authoritative and do not affect derived counts. No entry is a claim about current production state.\n\n` +
    `- entries: ${entries.length}\n` +
    `- authoritative: ${entries.filter(item => item.authorityLevel === 'authoritative').length}\n` +
    `- derived: ${entries.filter(item => item.authorityLevel === 'derived').length}\n` +
    `- informational: ${entries.filter(item => item.authorityLevel === 'informational').length}\n` +
    `- sensitive-data findings: ${entries.filter(item => item.containsSensitiveData).length}\n\n` +
    `| Manifest type | Path | Format | Schema/version | Tracking | Bytes | SHA-256 | Source phase | Authority | Sensitive |\n` +
    `| --- | --- | --- | --- | --- | ---: | --- | --- | --- | --- |\n${rows.join('\n')}\n`
  await Promise.all([
    writeJson('outputs/phase-13-evidence-index.json', result),
    writeText('outputs/phase-13-evidence-index.md', markdown)
  ])
  return result
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/discover-evidence.mjs')) {
  const result = await discoverEvidence()
  console.log(JSON.stringify({ status: 'ok', entries: result.entries.length, authority: Object.fromEntries(['authoritative', 'derived', 'informational'].map(level => [level, result.entries.filter(item => item.authorityLevel === level).length])), sensitiveFindings: result.entries.filter(item => item.containsSensitiveData).length }, null, 2))
}
