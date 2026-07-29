import { describe, expect, it } from 'vitest'
import { phase10RouteTemplate, safePathHash } from '~/server/utils/operationalLogging'
import {
  inspectRedactedDerivative,
  RedactedDerivativeInspectionError
} from '~/server/utils/redactedDerivative'

const bytes = (value: string) => new TextEncoder().encode(value)

const pngChunk = (name: string, data = new Uint8Array()) => {
  const output = new Uint8Array(12 + data.length)
  const view = new DataView(output.buffer)
  view.setUint32(0, data.length)
  output.set(bytes(name), 4)
  output.set(data, 8)
  return output
}

const png = (...chunks: Uint8Array[]) => {
  const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10])
  const output = new Uint8Array(signature.length + chunks.reduce((sum, item) => sum + item.length, 0))
  output.set(signature)
  let offset = signature.length
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }
  return output
}

describe('operational privacy helpers', () => {
  it('hashes paths deterministically without exposing the source path', async () => {
    const hash = await safePathHash('/private/person@example.com')
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(hash).toBe(await safePathHash('/private/person@example.com'))
    expect(hash).not.toContain('person')
  })

  it('redacts dynamic public identifiers from route templates', () => {
    expect(phase10RouteTemplate('/activities/summer-camp')).toBe('/activities/:slug')
    expect(phase10RouteTemplate('/news/launch')).toBe('/news/:slug')
    expect(phase10RouteTemplate('/years/114')).toBe('/years/:year')
    expect(phase10RouteTemplate('/api/public/activity-assets/550e8400-e29b-41d4-a716-446655440000'))
      .toBe('/api/public/activity-assets/:assetId')
    expect(phase10RouteTemplate('/api/public/files/550e8400-e29b-41d4-a716-446655440000/download'))
      .toBe('/api/public/files/:id/download')
    expect(phase10RouteTemplate('/api/health')).toBe('/api/health')
    expect(phase10RouteTemplate('/unknown/secret-value')).toBe('/:unmatched')
  })

  it('keeps known administrative route structure for operations', () => {
    expect(phase10RouteTemplate('/admin/editorial/P9-0042')).toBe('/admin/editorial/:reviewKey')
    expect(phase10RouteTemplate('/api/admin/editorial/550e8400-e29b-41d4-a716-446655440000'))
      .toBe('/api/admin/editorial/:id')
    expect(phase10RouteTemplate('/programs/exploration')).toBe('/programs/exploration')
  })
})

describe('redacted derivative inspection', () => {
  it('accepts metadata-free image and inert PDF containers', () => {
    expect(inspectRedactedDerivative('image/jpeg', Uint8Array.from([0xff, 0xd8, 0xff, 0xd9])))
      .toMatchObject({ metadataContainersRejected: true, activeContentRejected: false })
    expect(inspectRedactedDerivative('image/png', png(pngChunk('IEND'))))
      .toMatchObject({ signatureValidated: true })
    expect(inspectRedactedDerivative('image/webp', bytes('RIFF\u0000\u0000\u0000\u0000WEBP')))
      .toMatchObject({ metadataContainersRejected: true })
    expect(inspectRedactedDerivative('application/pdf', bytes('%PDF-1.7\n1 0 obj\n<<>>\nendobj')))
      .toMatchObject({ activeContentRejected: true })
  })

  it('rejects image metadata containers', () => {
    expect(() => inspectRedactedDerivative('image/jpeg', Uint8Array.from([
      0xff, 0xd8, 0xff, 0xe1, 0x00, 0x02, 0xff, 0xd9
    ]))).toThrow(RedactedDerivativeInspectionError)
    expect(() => inspectRedactedDerivative('image/png', png(pngChunk('tEXt'), pngChunk('IEND'))))
      .toThrow(/tEXt/)
    expect(() => inspectRedactedDerivative('image/webp', bytes('RIFF\u0000\u0000\u0000\u0000WEBPEXIF\u0000\u0000\u0000\u0000')))
      .toThrow(/EXIF/)
  })

  it('rejects active PDF content, leak tokens, and unsupported formats', () => {
    expect(() => inspectRedactedDerivative('application/pdf', bytes('%PDF /JavaScript')))
      .toThrow(/JavaScript/)
    expect(() => inspectRedactedDerivative('application/pdf', bytes('%PDF PHASE10_PRIVACY_FIXTURE_TOKEN')))
      .toThrow(/privacy leak token/)
    expect(() => inspectRedactedDerivative('text/plain', bytes('safe-looking')))
      .toThrow(/flattened PDF/)
  })
})
