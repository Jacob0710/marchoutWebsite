import { apiError } from '~/server/utils/apiErrors'

export const contentAssetsBucket = 'content-assets'
export const downloadsBucket = 'downloads'
export const signedContentUrlLifetimeSeconds = 60

const imageTypes: Record<string, readonly string[]> = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/webp': ['webp']
}

const documentTypes: Record<string, readonly string[]> = {
  'application/pdf': ['pdf'],
  'text/plain': ['txt'],
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx']
}

const ascii = (data: Uint8Array, start: number, end: number) => String.fromCharCode(...data.slice(start, end))
const begins = (data: Uint8Array, bytes: number[]) => bytes.every((byte, index) => data[index] === byte)

const signatureMatches = (mimeType: string, data: Uint8Array) => {
  if (mimeType === 'image/jpeg') return data[0] === 0xff && data[1] === 0xd8
  if (mimeType === 'image/png') return begins(data, [137, 80, 78, 71, 13, 10, 26, 10])
  if (mimeType === 'image/webp') return ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 12) === 'WEBP'
  if (mimeType === 'application/pdf') return ascii(data, 0, 5) === '%PDF-'
  if (mimeType === 'text/plain') return !data.includes(0)
  if (mimeType.includes('openxmlformats')) return begins(data, [0x50, 0x4b])
  return false
}

export const validateContentUpload = (input: {
  kind: 'image' | 'document'
  filename: string
  mimeType: string
  data: Uint8Array
}) => {
  const types = input.kind === 'image' ? imageTypes : documentTypes
  const maximum = input.kind === 'image' ? 10 * 1024 * 1024 : 20 * 1024 * 1024
  if (!input.data.length) throw apiError(415, 'UNSUPPORTED_FILE_TYPE', 'Empty files are not supported.')
  if (input.data.length > maximum) throw apiError(413, 'FILE_TOO_LARGE', `File exceeds the ${maximum / 1024 / 1024} MB limit.`)
  if (!input.mimeType) throw apiError(415, 'UNSUPPORTED_FILE_TYPE', 'A valid content type is required.')
  const extension = input.filename.split('.').pop()?.toLowerCase() ?? ''
  if (!types[input.mimeType]?.includes(extension) || !signatureMatches(input.mimeType, input.data)) {
    throw apiError(415, 'UNSUPPORTED_FILE_TYPE', 'File type, extension, or content signature is not supported.')
  }
  return extension === 'jpeg' ? 'jpg' : extension
}

export const makeContentAssetPath = (namespace: 'posts' | 'years', recordId: string, extension: string) =>
  `${namespace}/${recordId}/${crypto.randomUUID()}.${extension}`

export const makeDownloadPath = (recordId: string, extension: string) =>
  `files/${recordId}/${crypto.randomUUID()}.${extension}`
