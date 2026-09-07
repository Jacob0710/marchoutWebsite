import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { basename, extname } from 'node:path'

const fail = (message) => {
  throw new Error(`Phase 11 repository verification failed: ${message}`)
}

const tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .map((path) => path.replaceAll('\\', '/'))
  .filter((path) => existsSync(path))

const trackedSet = new Set(tracked)
const required = [
  '.github/dependabot.yml',
  '.github/workflows/phase11-quality.yml',
  '.github/workflows/production-synthetic.yml',
  'codexSteps/phase11.md',
  'eslint.config.mjs',
  'scripts/phase11/local-ssr-smoke.mjs',
  'scripts/phase11/verify-repository.mjs',
  'tests/components/common-components.spec.ts',
  'tests/unit/admin-access.spec.ts',
  'tests/unit/rules.spec.ts',
  'tests/unit/security-helpers.spec.ts',
  'tests/unit/validation.spec.ts',
  'vitest.config.ts'
]

for (const path of required) {
  if (!trackedSet.has(path)) fail(`required tracked file is missing: ${path}`)
}

const forbiddenPathPatterns = [
  /(?:^|\/)\.nuxt(?:\/|$)/,
  /(?:^|\/)\.output(?:\/|$)/,
  /(?:^|\/)\.phase(?:9|10|11)-(?:cache|private)(?:\/|$)/,
  /(?:^|\/)coverage(?:\/|$)/,
  /(?:^|\/)node_modules(?:\/|$)/,
  /(?:^|\/)migration\/phase(?:9|10)\/(?:private|tmp)(?:\/|$)/
]

for (const path of tracked) {
  const name = basename(path)
  if ((name === '.env' || name.startsWith('.env.')) && name !== '.env.example') {
    fail(`environment file must not be tracked: ${path}`)
  }
  if (forbiddenPathPatterns.some((pattern) => pattern.test(path))) {
    fail(`generated or private path must not be tracked: ${path}`)
  }
  if (['package-lock.json', 'yarn.lock', 'bun.lock', 'bun.lockb'].includes(name)) {
    fail(`pnpm is the only supported package manager: ${path}`)
  }
}

const likelyTextExtensions = new Set([
  '', '.css', '.csv', '.html', '.js', '.json', '.jsonl', '.md', '.mjs', '.sql',
  '.ts', '.tsx', '.txt', '.vue', '.yaml', '.yml'
])
const secretPatterns = [
  {
    name: 'private key',
    pattern: new RegExp(['-----BEGIN ', '(?:RSA |EC |OPENSSH )?', 'PRIVATE KEY-----'].join(''), 'g')
  },
  {
    name: 'GitHub classic token',
    pattern: new RegExp(['\\bgh', '[pousr]_', '[A-Za-z0-9]{30,}\\b'].join(''), 'g')
  },
  {
    name: 'GitHub fine-grained token',
    pattern: new RegExp(['\\bgithub_', 'pat_', '[A-Za-z0-9_]{40,}\\b'].join(''), 'g')
  },
  {
    name: 'live payment key',
    pattern: new RegExp(['\\b(?:sk|rk)_', 'live_', '[A-Za-z0-9]{16,}\\b'].join(''), 'g')
  },
  {
    name: 'credential-bearing PostgreSQL URL',
    pattern: /postgres(?:ql)?:\/\/[^:\s/]+:[^@\s/]+@/gi
  }
]

const decodeJwtPayload = (token) => {
  try {
    const segment = token.split('.')[1]
    if (!segment) return null
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

for (const path of tracked) {
  if (!likelyTextExtensions.has(extname(path).toLowerCase())) continue
  const source = readFileSync(path, 'utf8')
  if (source.includes('\0')) continue
  for (const { name, pattern } of secretPatterns) {
    pattern.lastIndex = 0
    if (pattern.test(source)) fail(`${name} signature found in ${path}`)
  }
  for (const token of source.match(/\beyJ[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\.[A-Za-z0-9_-]{12,}\b/g) ?? []) {
    if (decodeJwtPayload(token)?.role === 'service_role') {
      fail(`Supabase service-role JWT found in ${path}`)
    }
  }
}

const workflowPaths = tracked.filter((path) => /^\.github\/workflows\/.+\.ya?ml$/.test(path))
if (workflowPaths.length === 0) fail('no GitHub Actions workflow is tracked')

let actionReferenceCount = 0
for (const path of workflowPaths) {
  const source = readFileSync(path, 'utf8')
  if (/\bpull_request_target\s*:/.test(source)) fail(`unsafe pull_request_target trigger found in ${path}`)
  if (/\bpermissions\s*:\s*write-all\b/.test(source)) fail(`write-all token permission found in ${path}`)
  if (!/\bpermissions\s*:\s*\r?\n\s+contents\s*:\s*read\b/.test(source)) {
    fail(`least-privilege contents: read permission is missing in ${path}`)
  }
  for (const match of source.matchAll(/^\s*-\s+uses:\s*([^\s#]+)/gm)) {
    const reference = match[1]
    if (reference.startsWith('./') || reference.startsWith('docker://')) continue
    actionReferenceCount += 1
    const separator = reference.lastIndexOf('@')
    const revision = separator >= 0 ? reference.slice(separator + 1) : ''
    if (!/^[0-9a-f]{40}$/.test(revision)) {
      fail(`mutable action reference in ${path}: ${reference}`)
    }
  }
}

const phase11Workflow = readFileSync('.github/workflows/phase11-quality.yml', 'utf8')
if (/^\s*schedule\s*:/m.test(phase11Workflow) || /\n {2}production-synthetic:/.test(phase11Workflow)) {
  fail('production synthetic schedule must remain isolated from quality check names')
}
const productionSyntheticWorkflow = readFileSync('.github/workflows/production-synthetic.yml', 'utf8')
if (!/schedule:[\s\S]*?cron:\s*'17 \* \* \* \*'/.test(productionSyntheticWorkflow)
  || !/\n {2}production-synthetic:/.test(productionSyntheticWorkflow)
  || !/PHASE10_SYNTHETIC_ORIGIN:\s*https:\/\/marchout-website\.vercel\.app/.test(productionSyntheticWorkflow)
  || !/node scripts\/phase10\/synthetic-check\.mjs/.test(productionSyntheticWorkflow)) {
  fail('isolated production synthetic workflow contract is incomplete')
}

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))
if (packageJson.packageManager !== 'pnpm@11.9.0') fail('packageManager must remain pnpm@11.9.0')
if (packageJson.engines?.node !== '>=24.0.0') fail('Node 24 runtime contract is missing')
for (const script of ['lint', 'test', 'test:coverage', 'test:integration', 'phase11:verify', 'phase11:audit', 'test:phase11']) {
  if (!packageJson.scripts?.[script]) fail(`package script is missing: ${script}`)
}

const lockfile = readFileSync('pnpm-lock.yaml', 'utf8')
if (!lockfile.includes("lockfileVersion: '9.0'")) fail('pnpm lockfile version is unexpected')

const testCount = tracked.filter((path) => /^tests\/.+\.spec\.ts$/.test(path)).length
if (testCount < 5) fail(`expected at least 5 tracked test files, found ${testCount}`)

console.log(JSON.stringify({
  status: 'ok',
  trackedFiles: tracked.length,
  workflowFiles: workflowPaths.length,
  immutableActionReferences: actionReferenceCount,
  testFiles: testCount,
  secretFindings: 0,
  forbiddenTrackedArtifacts: 0
}, null, 2))
