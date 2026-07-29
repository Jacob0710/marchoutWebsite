import fs from 'node:fs'
import path from 'node:path'
import { unzipSync } from 'fflate'

const roots = ['playwright-report', 'test-results'].map(item => path.resolve(item)).filter(item => fs.existsSync(item))
const findings = []
const publicRuntimeValues = Object.entries(process.env)
  .filter(([name, value]) => /^(?:NUXT_PUBLIC_|PHASE12_STAGING_SUPABASE_ANON_KEY$)/i.test(name) && value && value.length >= 8)
  .map(([, value]) => value)
const secretValues = Object.entries(process.env)
  .filter(([name, value]) => /(?:PASSWORD|TOKEN|SECRET|COOKIE|SERVICE_ROLE|DATABASE_URL)/i.test(name) && value && value.length >= 8)
  .map(([name, value]) => ({ name, value }))
const signatures = [
  ['private-key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['github-token', /\bgh[opsu]_[A-Za-z0-9_]{20,}\b/g],
  ['jwt', /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g],
  ['credential-url', /\b(?:postgres(?:ql)?|https?):\/\/[^/\s:@]+:[^@\s/]+@/gi],
  ['signed-url', /[?&](?:token|signature|x-amz-signature)=[^&\s"']+/gi]
]
let files = 0
let bytes = 0

const inspect = (name, content) => {
  files += 1
  bytes += content.byteLength
  let text = Buffer.from(content).toString('utf8')
  for (const value of publicRuntimeValues) text = text.replaceAll(value, '[PUBLIC_RUNTIME_VALUE]')
  for (const secret of secretValues) {
    if (text.includes(secret.value)) findings.push({ file: name, type: `environment-value:${secret.name}` })
  }
  for (const [type, pattern] of signatures) {
    pattern.lastIndex = 0
    if (pattern.test(text)) findings.push({ file: name, type })
  }
  if (name.toLowerCase().endsWith('.zip')) {
    try {
      const entries = unzipSync(new Uint8Array(content))
      for (const [entry, value] of Object.entries(entries)) inspect(`${name}!${entry}`, value)
    } catch {
      findings.push({ file: name, type: 'unreadable-zip' })
    }
  }
}

const walk = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const item = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(item)
    else inspect(path.relative(process.cwd(), item), fs.readFileSync(item))
  }
}
for (const root of roots) walk(root)

if (findings.length) {
  console.error(JSON.stringify({ status: 'failed', files, bytes, findings }, null, 2))
  process.exit(1)
}
console.log(JSON.stringify({ status: 'passed', files, bytes, secretFindings: 0 }, null, 2))
