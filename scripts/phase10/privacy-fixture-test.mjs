import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { root } from './lib/core.mjs'

const { inspectRedactedDerivative, RedactedDerivativeInspectionError } = await import('../../server/utils/redactedDerivative.ts')
const bytes = (text) => new TextEncoder().encode(text)
const expectRejected = (label, operation) => {
  try { operation() } catch (error) {
    if (error instanceof RedactedDerivativeInspectionError) return
    throw error
  }
  throw new Error(`${label} was not rejected`)
}

const cleanJpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])
inspectRedactedDerivative('image/jpeg', cleanJpeg)
expectRejected('JPEG EXIF', () => inspectRedactedDerivative('image/jpeg', Uint8Array.from([
  0xff, 0xd8, 0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0xff, 0xd9
])))

const png = (chunk) => Uint8Array.from([
  137, 80, 78, 71, 13, 10, 26, 10,
  0, 0, 0, 0, ...[...chunk].map((char) => char.charCodeAt(0)), 0, 0, 0, 0,
  0, 0, 0, 0, 73, 69, 78, 68, 0, 0, 0, 0
])
inspectRedactedDerivative('image/png', png('IDAT'))
expectRejected('PNG text metadata', () => inspectRedactedDerivative('image/png', png('tEXt')))

inspectRedactedDerivative('application/pdf', bytes('%PDF-1.7\n1 0 obj << /Type /Page >> endobj\n%%EOF'))
expectRejected('PDF active annotation', () => inspectRedactedDerivative('application/pdf', bytes('%PDF-1.7\n/Annots []\n%%EOF')))
expectRejected('PDF synthetic leak token', () => inspectRedactedDerivative('application/pdf', bytes('%PDF-1.7\nPHASE10_PRIVACY_FIXTURE_DO_NOT_PUBLISH\n%%EOF')))

const logger = await readFile(resolve(root, 'server/utils/operationalLogging.ts'), 'utf8')
for (const prohibited of ['authorization header', 'set-cookie', 'request body', 'signed url']) {
  if (logger.toLowerCase().includes(prohibited)) throw new Error(`Operational logger mentions prohibited field: ${prohibited}`)
}
console.log(JSON.stringify({ status: 'passed', fixtures: 7, realPersonalDataUsed: false, filesWritten: 0 }, null, 2))
