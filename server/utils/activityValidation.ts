import type { ActivityType } from '~/types/content'
import type { AdminActivityInput } from '~/types/adminActivity'
import { activitySlugPattern, activityTypes, isHttpsUrl } from '~/shared/activityRules'

type FieldErrors = Record<string, string[]>

const own = (value: object, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const addError = (errors: FieldErrors, field: string, message: string) => {
  ;(errors[field] ??= []).push(message)
}
const stringValue = (value: unknown) => typeof value === 'string' ? value.trim() : null
const nullableString = (value: unknown) => value === null || value === '' ? null : stringValue(value)
const datePattern = /^\d{4}-\d{2}-\d{2}$/

export interface ValidatedActivityPatch {
  values: Partial<AdminActivityInput>
  provided: Set<keyof AdminActivityInput>
}

export const validateActivityPayload = (value: unknown, requireTitle = false): ValidatedActivityPatch => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw apiError(400, 'VALIDATION_ERROR', 'Invalid activity payload.')
  }

  const allowed = new Set<keyof AdminActivityInput>([
    'title', 'slug', 'academicYear', 'activityType', 'eventDate', 'location',
    'participantsCount', 'resultSummary', 'content', 'isFeatured', 'tags'
  ])
  const errors: FieldErrors = {}
  const provided = new Set<keyof AdminActivityInput>()
  const values: Partial<AdminActivityInput> = {}

  for (const key of Object.keys(value)) {
    if (!allowed.has(key as keyof AdminActivityInput)) addError(errors, key, 'This field is not allowed.')
  }

  const input = value as Record<string, unknown>
  if (own(input, 'title') || requireTitle) {
    provided.add('title')
    const title = stringValue(input.title)
    if (!title) addError(errors, 'title', '請輸入活動標題。')
    else if (title.length > 200) addError(errors, 'title', '活動標題不可超過 200 個字元。')
    else values.title = title
  }

  if (own(input, 'slug')) {
    provided.add('slug')
    const slug = stringValue(input.slug)
    if (!slug || !activitySlugPattern.test(slug)) addError(errors, 'slug', 'Slug 必須是小寫英數字並以單一連字號分隔。')
    else if (slug.length > 160) addError(errors, 'slug', 'Slug 不可超過 160 個字元。')
    else values.slug = slug
  }

  if (own(input, 'academicYear')) {
    provided.add('academicYear')
    if (!Number.isInteger(input.academicYear) || Number(input.academicYear) < 1 || Number(input.academicYear) > 999) addError(errors, 'academicYear', '學年度必須是 1 到 999 的整數。')
    else values.academicYear = Number(input.academicYear)
  }

  if (own(input, 'activityType')) {
    provided.add('activityType')
    if (!activityTypes.includes(input.activityType as ActivityType)) addError(errors, 'activityType', '活動分類不合法。')
    else values.activityType = input.activityType as ActivityType
  }

  if (own(input, 'eventDate')) {
    provided.add('eventDate')
    const eventDate = nullableString(input.eventDate)
    if (eventDate && (!datePattern.test(eventDate) || Number.isNaN(Date.parse(`${eventDate}T00:00:00Z`)))) addError(errors, 'eventDate', '活動日期不合法。')
    else values.eventDate = eventDate
  }

  for (const field of ['location', 'resultSummary', 'content'] as const) {
    if (!own(input, field)) continue
    provided.add(field)
    const normalized = nullableString(input[field])
    const maximum = field === 'location' ? 300 : 50000
    if (normalized !== null && typeof normalized !== 'string') addError(errors, field, '欄位格式不合法。')
    else if (normalized && normalized.length > maximum) addError(errors, field, `欄位不可超過 ${maximum} 個字元。`)
    else values[field] = normalized
  }

  if (own(input, 'participantsCount')) {
    provided.add('participantsCount')
    if (input.participantsCount === null) values.participantsCount = null
    else {
      if (!Number.isInteger(input.participantsCount) || Number(input.participantsCount) < 0) addError(errors, 'participantsCount', '參與人數必須是大於或等於 0 的整數。')
      else values.participantsCount = Number(input.participantsCount)
    }
  }

  if (own(input, 'isFeatured')) {
    provided.add('isFeatured')
    if (typeof input.isFeatured !== 'boolean') addError(errors, 'isFeatured', '精選狀態格式不合法。')
    else values.isFeatured = input.isFeatured
  }

  if (own(input, 'tags')) {
    provided.add('tags')
    if (!Array.isArray(input.tags) || input.tags.length > 20 || input.tags.some((tag) => typeof tag !== 'string' || !tag.trim() || tag.trim().length > 50)) {
      addError(errors, 'tags', '標籤格式不合法。')
    } else {
      values.tags = [...new Set(input.tags.map((tag) => String(tag).trim()))]
    }
  }

  if (Object.keys(errors).length) throw apiError(400, 'VALIDATION_ERROR', 'Activity validation failed.', errors)
  if (!requireTitle && provided.size === 0) throw apiError(400, 'VALIDATION_ERROR', 'No editable fields were provided.')
  return { values, provided }
}

export const validatePublishable = (activity: {
  title: string | null
  slug: string | null
  academic_year: number | null
  activity_type: string | null
  event_date: string | null
  location: string | null
  participants_count: number | null
  result_summary: string | null
  content: string | null
}) => {
  const errors: FieldErrors = {}
  if (!activity.title?.trim()) addError(errors, 'title', '請輸入活動標題。')
  if (!activity.slug || !activitySlugPattern.test(activity.slug)) addError(errors, 'slug', '請輸入有效 Slug。')
  if (!Number.isInteger(activity.academic_year) || Number(activity.academic_year) < 1) addError(errors, 'academicYear', '請輸入有效學年度。')
  if (!activityTypes.includes(activity.activity_type as ActivityType)) addError(errors, 'activityType', '請選擇活動分類。')
  if (!activity.event_date || !datePattern.test(activity.event_date)) addError(errors, 'eventDate', '請輸入活動日期。')
  if (!activity.location?.trim()) addError(errors, 'location', '請輸入活動地點。')
  if (!activity.result_summary?.trim()) addError(errors, 'resultSummary', '請輸入活動成果摘要。')
  if (!activity.content?.trim()) addError(errors, 'content', '請輸入活動正文。')
  if (activity.participants_count !== null && (!Number.isInteger(activity.participants_count) || activity.participants_count < 0)) addError(errors, 'participantsCount', '參與人數不合法。')
  if (Object.keys(errors).length) throw apiError(400, 'VALIDATION_ERROR', 'Activity is not ready to publish.', errors)
}

export const validateVideoPayload = (value: unknown, partial = false) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid video payload.')
  const input = value as Record<string, unknown>
  const allowed = new Set(['url', 'title', 'sortOrder'])
  if (Object.keys(input).some((key) => !allowed.has(key))) throw apiError(400, 'VALIDATION_ERROR', 'Video payload contains an unsupported field.')
  const output: { url?: string; title?: string | null; sortOrder?: number } = {}
  if (own(input, 'url') || !partial) {
    const url = stringValue(input.url)
    if (!url || url.length > 2048 || !isHttpsUrl(url)) throw apiError(400, 'VALIDATION_ERROR', '影片網址必須是有效的 HTTPS URL.', { url: ['請輸入有效的 HTTPS URL。'] })
    output.url = url
  }
  if (own(input, 'title')) {
    const title = nullableString(input.title)
    if (title !== null && (typeof title !== 'string' || title.length > 200)) throw apiError(400, 'VALIDATION_ERROR', '影片名稱不合法。')
    output.title = title
  }
  if (own(input, 'sortOrder')) {
    if (!Number.isInteger(input.sortOrder) || Number(input.sortOrder) < 0) throw apiError(400, 'VALIDATION_ERROR', '影片排序必須是非負整數。')
    output.sortOrder = Number(input.sortOrder)
  }
  if (partial && Object.keys(output).length === 0) throw apiError(400, 'VALIDATION_ERROR', 'No editable video fields were provided.')
  return output
}
