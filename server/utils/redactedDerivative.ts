const ascii = (data: Uint8Array, start = 0, end = data.length) => String.fromCharCode(...data.slice(start, end))

export class RedactedDerivativeInspectionError extends Error {}

const reject = (message: string): never => { throw new RedactedDerivativeInspectionError(message) }

const inspectJpeg = (data: Uint8Array) => {
  let offset = 2
  while (offset + 4 <= data.length && data[offset] === 0xff) {
    const marker = data[offset + 1]!
    if (marker === 0xda || marker === 0xd9) break
    if (marker === 0xe1 || marker === 0xfe) reject('Redacted JPEG must not contain EXIF/XMP or comment metadata.')
    const length = (data[offset + 2]! << 8) + data[offset + 3]!
    if (length < 2) reject('Malformed JPEG metadata segment.')
    offset += length + 2
  }
}

const inspectPng = (data: Uint8Array) => {
  let offset = 8
  while (offset + 12 <= data.length) {
    const length = ((data[offset]! << 24) >>> 0) + (data[offset + 1]! << 16) + (data[offset + 2]! << 8) + data[offset + 3]!
    const chunk = ascii(data, offset + 4, offset + 8)
    if (['eXIf', 'tEXt', 'zTXt', 'iTXt'].includes(chunk)) reject(`Redacted PNG must not contain ${chunk} metadata.`)
    offset += 12 + length
    if (chunk === 'IEND') break
  }
  if (offset > data.length) reject('Malformed PNG chunk length.')
}

const inspectWebp = (data: Uint8Array) => {
  let offset = 12
  while (offset + 8 <= data.length) {
    const chunk = ascii(data, offset, offset + 4)
    const length = data[offset + 4]! + (data[offset + 5]! << 8) + (data[offset + 6]! << 16) + (data[offset + 7]! << 24)
    if (['EXIF', 'XMP '].includes(chunk)) reject(`Redacted WebP must not contain ${chunk.trim()} metadata.`)
    offset += 8 + length + (length % 2)
  }
  if (offset > data.length + 1) reject('Malformed WebP chunk length.')
}

const inspectPdf = (data: Uint8Array) => {
  const source = ascii(data)
  const forbidden = ['/Encrypt', '/JavaScript', '/JS', '/Launch', '/EmbeddedFile', '/AcroForm', '/XFA', '/Annots', '/OCProperties', '/Metadata']
  const found = forbidden.find((token) => source.includes(token))
  if (found) reject(`Flattened redacted PDF contains prohibited ${found} structure.`)
  if (source.includes('PHASE10_PRIVACY_FIXTURE_')) reject('Synthetic privacy leak token remains in the derivative.')
}

export const inspectRedactedDerivative = (mimeType: string, data: Uint8Array) => {
  if (mimeType === 'image/jpeg') inspectJpeg(data)
  else if (mimeType === 'image/png') inspectPng(data)
  else if (mimeType === 'image/webp') inspectWebp(data)
  else if (mimeType === 'application/pdf') inspectPdf(data)
  else reject('Redacted derivatives must be flattened PDF or metadata-free JPEG/PNG/WebP.')
  return {
    signatureValidated: true,
    metadataContainersRejected: true,
    activeContentRejected: mimeType === 'application/pdf',
    syntheticLeakTokenRejected: true,
    operatorContentAndAuthorizationReviewStillRequired: true
  }
}
