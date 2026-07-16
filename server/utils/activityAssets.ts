import type { ActivityAssetKind } from '~/types/adminActivity'

export const activityAssetsBucket = 'activity-assets'
export const signedAssetUrlLifetimeSeconds = 60

const definitions = {
  image: {
    maximum: 10 * 1024 * 1024,
    mimeExtensions: {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp'],
      'image/gif': ['gif']
    }
  },
  attachment: {
    maximum: 20 * 1024 * 1024,
    mimeExtensions: {
      'application/pdf': ['pdf'],
      'text/plain': ['txt'],
      'application/msword': ['doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
      'application/vnd.ms-excel': ['xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
      'application/vnd.ms-powerpoint': ['ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx']
    }
  }
} as const

const startsWithBytes = (data: Uint8Array, bytes: number[]) => bytes.every((value, index) => data[index] === value)
const ascii = (data: Uint8Array, start: number, end: number) => String.fromCharCode(...data.slice(start, end))

const hasSignature = (mimeType: string, data: Uint8Array) => {
  if (mimeType === 'image/jpeg') return data[0] === 0xff && data[1] === 0xd8 && data[data.length - 2] === 0xff && data[data.length - 1] === 0xd9
  if (mimeType === 'image/png') return startsWithBytes(data, [137, 80, 78, 71, 13, 10, 26, 10])
  if (mimeType === 'image/gif') return ['GIF87a', 'GIF89a'].includes(ascii(data, 0, 6))
  if (mimeType === 'image/webp') return ascii(data, 0, 4) === 'RIFF' && ascii(data, 8, 12) === 'WEBP'
  if (mimeType === 'application/pdf') return ascii(data, 0, 5) === '%PDF-'
  if (mimeType === 'text/plain') return !data.includes(0)
  if (mimeType.includes('openxmlformats')) return data[0] === 0x50 && data[1] === 0x4b
  if (['application/msword', 'application/vnd.ms-excel', 'application/vnd.ms-powerpoint'].includes(mimeType)) {
    return startsWithBytes(data, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
  }
  return false
}

export const validateAssetUpload = (input: {
  kind: ActivityAssetKind
  filename: string
  mimeType: string
  data: Uint8Array
}) => {
  const definition = definitions[input.kind]
  if (!definition || !input.data.length) throw apiError(415, 'UNSUPPORTED_FILE_TYPE', 'Empty or unsupported file.')
  if (input.data.length > definition.maximum) throw apiError(413, 'FILE_TOO_LARGE', `File exceeds the ${definition.maximum / 1024 / 1024} MB limit.`)

  const extension = input.filename.split('.').pop()?.toLowerCase() ?? ''
  const allowedExtensions = (definition.mimeExtensions as Record<string, readonly string[]>)[input.mimeType]
  if (!allowedExtensions?.includes(extension) || !hasSignature(input.mimeType, input.data)) {
    throw apiError(415, 'UNSUPPORTED_FILE_TYPE', 'File type, extension, or content signature is not supported.')
  }
  return extension === 'jpeg' ? 'jpg' : extension
}

export const makeActivityAssetPath = (activityId: string, kind: ActivityAssetKind, extension: string) =>
  `${activityId}/${kind}/${crypto.randomUUID()}.${extension}`

export const safeDownloadName = (value: string) => value
  .replace(/[\r\n"\\/]/g, '_')
  .replace(/[\u0000-\u001f\u007f]/g, '')
  .trim()
  .slice(0, 180) || 'download'
