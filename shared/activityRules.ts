import type { ActivityType } from '~/types/content'

export const activityTypes = ['regular', 'project', 'exploration'] as const satisfies readonly ActivityType[]
export const activitySlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
export const activityAssetKinds = ['image', 'attachment'] as const

export const activityTypeLabels: Record<ActivityType, string> = {
  regular: '一般活動',
  project: '服務活動',
  exploration: '特殊活動'
}

export const toActivitySlug = (value: string) => value
  .normalize('NFKD')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

export const isHttpsUrl = (value: string) => {
  try {
    return new URL(value).protocol === 'https:'
  } catch {
    return false
  }
}

export const toSafeVideoEmbedUrl = (value: string): string | null => {
  if (!isHttpsUrl(value)) return null
  const url = new URL(value)
  const host = url.hostname.toLowerCase().replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const id = url.pathname.startsWith('/embed/')
      ? url.pathname.split('/')[2]
      : url.searchParams.get('v')
    return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
  }

  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = url.pathname.split('/').filter(Boolean).find((part) => /^\d+$/.test(part))
    return id ? `https://player.vimeo.com/video/${id}` : null
  }

  return null
}
