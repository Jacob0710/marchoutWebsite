import type { ContentStatus } from '~/types/content'
import type { ContentStatistic, FaqInput, FileMetadataInput, MapLocation, PostInput, SiteSettingsInput, YearSummaryInput } from '~/types/coreContent'
import { contentSlugPattern, isSafeHttpsUrl, uuidPattern } from '~/shared/contentRules'

type InputObject = Record<string, unknown>
type FieldErrors = Record<string, string[]>

const isObject = (value: unknown): value is InputObject => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const owns = (value: InputObject, key: string) => Object.prototype.hasOwnProperty.call(value, key)
const trim = (value: unknown) => typeof value === 'string' ? value.trim() : null
const nullableTrim = (value: unknown) => value === null || value === '' ? '' : trim(value)
const add = (errors: FieldErrors, key: string, message: string) => { (errors[key] ??= []).push(message) }
const assertAllowed = (input: InputObject, allowed: readonly string[]) => {
  const invalid = Object.keys(input).find((key) => !allowed.includes(key))
  if (invalid) throw apiError(400, 'VALIDATION_ERROR', 'Request contains an unsupported field.', { [invalid]: ['This field is not allowed.'] })
}
const finish = <T>(errors: FieldErrors, output: Partial<T>, partial: boolean) => {
  if (Object.keys(errors).length) throw apiError(400, 'VALIDATION_ERROR', 'Validation failed.', errors)
  if (partial && Object.keys(output as object).length === 0) throw apiError(400, 'VALIDATION_ERROR', 'No editable fields were provided.')
  return output as T
}
export const requireContentUuid = (value: string | undefined, label = 'Resource') => {
  if (!value || !uuidPattern.test(value)) throw apiError(404, 'NOT_FOUND', `${label} not found.`)
  return value
}

export const validatePostInput = (value: unknown, partial = false): Partial<PostInput> => {
  if (!isObject(value)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid post payload.')
  assertAllowed(value, ['title', 'slug', 'excerpt', 'content', 'coverAlt', 'isFeatured'])
  const output: Partial<PostInput> = {}
  const errors: FieldErrors = {}
  const required = (key: 'title' | 'slug' | 'content', minimum: number, maximum: number) => {
    if (!owns(value, key) && partial) return
    const normalized = trim(value[key])
    if (!normalized || normalized.length < minimum || normalized.length > maximum) add(errors, key, `Length must be ${minimum}-${maximum}.`)
    else output[key] = normalized
  }
  required('title', 1, 160)
  required('slug', 1, 180)
  required('content', 1, 100000)
  if (typeof output.slug === 'string' && !contentSlugPattern.test(output.slug)) add(errors, 'slug', 'Slug must use lowercase letters, numbers, and single hyphens.')
  if (owns(value, 'excerpt')) {
    const excerpt = nullableTrim(value.excerpt)
    if (excerpt === null || excerpt.length > 500) add(errors, 'excerpt', 'Excerpt must be at most 500 characters.')
    else output.excerpt = excerpt
  }
  if (owns(value, 'coverAlt')) {
    const coverAlt = nullableTrim(value.coverAlt)
    if (coverAlt === null || coverAlt.length > 300) add(errors, 'coverAlt', 'Cover alt text must be at most 300 characters.')
    else output.coverAlt = coverAlt
  }
  if (owns(value, 'isFeatured')) {
    if (typeof value.isFeatured !== 'boolean') add(errors, 'isFeatured', 'Featured must be a boolean.')
    else output.isFeatured = value.isFeatured
  }
  return finish(errors, output, partial)
}

export const validateFileMetadata = (value: unknown, partial = false): Partial<FileMetadataInput> => {
  if (!isObject(value)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid file metadata.')
  assertAllowed(value, ['title', 'description', 'academicYear', 'category', 'sortOrder'])
  const output: Partial<FileMetadataInput> = {}
  const errors: FieldErrors = {}
  if (owns(value, 'title') || !partial) {
    const title = trim(value.title)
    if (!title || title.length > 200) add(errors, 'title', 'Title is required and must be at most 200 characters.')
    else output.title = title
  }
  for (const field of ['description', 'category'] as const) {
    if (!owns(value, field)) continue
    const normalized = nullableTrim(value[field])
    const maximum = field === 'description' ? 5000 : 100
    if (normalized === null || normalized.length > maximum) add(errors, field, `Field must be at most ${maximum} characters.`)
    else output[field] = normalized
  }
  if (owns(value, 'academicYear')) {
    if (value.academicYear === null || value.academicYear === '') output.academicYear = null
    else if (!Number.isInteger(value.academicYear) || Number(value.academicYear) < 90 || Number(value.academicYear) > 200) add(errors, 'academicYear', 'Academic year must be 90-200.')
    else output.academicYear = Number(value.academicYear)
  }
  if (owns(value, 'sortOrder')) {
    if (!Number.isInteger(value.sortOrder) || Number(value.sortOrder) < 0) add(errors, 'sortOrder', 'Sort order must be a non-negative integer.')
    else output.sortOrder = Number(value.sortOrder)
  }
  return finish(errors, output, partial)
}

export const validateFaqInput = (value: unknown, partial = false): Partial<FaqInput> => {
  if (!isObject(value)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid FAQ payload.')
  assertAllowed(value, ['question', 'answer', 'sortOrder', 'isActive'])
  const output: Partial<FaqInput> = {}
  const errors: FieldErrors = {}
  for (const [field, maximum] of [['question', 300], ['answer', 10000]] as const) {
    if (!owns(value, field) && partial) continue
    const normalized = trim(value[field])
    if (!normalized || normalized.length > maximum) add(errors, field, `${field} is required and must be at most ${maximum} characters.`)
    else output[field] = normalized
  }
  if (owns(value, 'sortOrder')) {
    if (!Number.isInteger(value.sortOrder) || Number(value.sortOrder) < 0) add(errors, 'sortOrder', 'Sort order must be a non-negative integer.')
    else output.sortOrder = Number(value.sortOrder)
  }
  if (owns(value, 'isActive')) {
    if (typeof value.isActive !== 'boolean') add(errors, 'isActive', 'Active must be a boolean.')
    else output.isActive = value.isActive
  }
  return finish(errors, output, partial)
}

const parseHighlights = (value: unknown, errors: FieldErrors) => {
  if (!Array.isArray(value) || value.length > 30 || value.some((item) => typeof item !== 'string' || !item.trim() || item.trim().length > 300)) {
    add(errors, 'highlights', 'Highlights must contain up to 30 non-empty text items.')
    return undefined
  }
  return value.map((item) => String(item).trim())
}

const parseStatistics = (value: unknown, errors: FieldErrors): ContentStatistic[] | undefined => {
  if (!Array.isArray(value) || value.length > 30) {
    add(errors, 'statistics', 'Statistics must contain up to 30 items.')
    return undefined
  }
  const output: ContentStatistic[] = []
  for (const item of value) {
    if (!isObject(item)) { add(errors, 'statistics', 'Each statistic requires a label and value.'); return undefined }
    const label = trim(item.label)
    const statisticValue = trim(item.value)
    if (!label || !statisticValue || label.length > 100 || statisticValue.length > 100) {
      add(errors, 'statistics', 'Statistic labels and values must be 1-100 characters.')
      return undefined
    }
    output.push({ label, value: statisticValue })
  }
  return output
}

export const validateYearInput = (value: unknown, partial = false): Partial<YearSummaryInput> => {
  if (!isObject(value)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid year summary payload.')
  assertAllowed(value, ['academicYear', 'title', 'theme', 'summary', 'highlights', 'statistics', 'coverAlt', 'reportFileId', 'sortOrder'])
  const output: Partial<YearSummaryInput> = {}
  const errors: FieldErrors = {}
  if (owns(value, 'academicYear') || !partial) {
    if (!Number.isInteger(value.academicYear) || Number(value.academicYear) < 90 || Number(value.academicYear) > 200) add(errors, 'academicYear', 'Academic year must be 90-200.')
    else output.academicYear = Number(value.academicYear)
  }
  for (const [field, maximum] of [['title', 200], ['summary', 50000]] as const) {
    if (!owns(value, field) && partial) continue
    const normalized = trim(value[field])
    if (!normalized || normalized.length > maximum) add(errors, field, `${field} is required and must be at most ${maximum} characters.`)
    else output[field] = normalized
  }
  for (const [field, maximum] of [['theme', 300], ['coverAlt', 300]] as const) {
    if (!owns(value, field)) continue
    const normalized = nullableTrim(value[field])
    if (normalized === null || normalized.length > maximum) add(errors, field, `${field} must be at most ${maximum} characters.`)
    else output[field] = normalized
  }
  if (owns(value, 'highlights')) output.highlights = parseHighlights(value.highlights, errors)
  if (owns(value, 'statistics')) output.statistics = parseStatistics(value.statistics, errors)
  if (owns(value, 'reportFileId')) {
    if (value.reportFileId === null || value.reportFileId === '') output.reportFileId = null
    else if (typeof value.reportFileId !== 'string' || !uuidPattern.test(value.reportFileId)) add(errors, 'reportFileId', 'Report file id is invalid.')
    else output.reportFileId = value.reportFileId
  }
  if (owns(value, 'sortOrder')) {
    if (!Number.isInteger(value.sortOrder) || Number(value.sortOrder) < 0) add(errors, 'sortOrder', 'Sort order must be a non-negative integer.')
    else output.sortOrder = Number(value.sortOrder)
  }
  return finish(errors, output, partial)
}

const parseLocations = (value: unknown, errors: FieldErrors): MapLocation[] | undefined => {
  if (!Array.isArray(value) || value.length > 20) { add(errors, 'locations', 'Locations must contain up to 20 items.'); return undefined }
  const output: MapLocation[] = []
  for (const item of value) {
    if (!isObject(item)) { add(errors, 'locations', 'Each location is invalid.'); return undefined }
    const title = trim(item.title) ?? ''
    const address = trim(item.address) ?? ''
    const mapUrl = trim(item.mapUrl) ?? ''
    if (!title || title.length > 150 || address.length > 300 || !isSafeHttpsUrl(mapUrl)) {
      add(errors, 'locations', 'Location title, address, or HTTPS map URL is invalid.')
      return undefined
    }
    output.push({ title, address, mapUrl })
  }
  return output
}

export const validateSettingsInput = (value: unknown): Partial<SiteSettingsInput> => {
  if (!isObject(value)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid settings payload.')
  const allowed = ['siteName','clubNameZh','clubNameEn','slogan','heroTitle','heroSubtitle','aboutSummary','facebookUrl','instagramUrl','youtubeUrl','contactText','email','phone','locations','defaultSeoTitle','defaultSeoDescription','footerText'] as const
  assertAllowed(value, allowed)
  const output: Record<string, unknown> = {}
  const errors: FieldErrors = {}
  const required = new Set(['siteName', 'clubNameZh', 'clubNameEn', 'slogan', 'heroTitle'])
  for (const field of allowed) {
    if (!owns(value, field) || field === 'locations') continue
    const normalized = nullableTrim(value[field])
    const maximum = ['aboutSummary','contactText'].includes(field) ? 5000 : ['defaultSeoDescription','heroSubtitle'].includes(field) ? 500 : 300
    if (normalized === null || normalized.length > maximum || (required.has(field) && !normalized)) add(errors, field, `Field is invalid or exceeds ${maximum} characters.`)
    else output[field] = normalized
  }
  for (const field of ['facebookUrl', 'instagramUrl', 'youtubeUrl'] as const) {
    if (typeof output[field] === 'string' && !isSafeHttpsUrl(output[field] as string)) add(errors, field, 'URL must be HTTPS.')
  }
  if (typeof output.email === 'string' && output.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(output.email)) add(errors, 'email', 'Email is invalid.')
  if (owns(value, 'locations')) output.locations = parseLocations(value.locations, errors)
  return finish(errors, output as Partial<SiteSettingsInput>, true)
}

export const validateStatusQuery = (value: unknown): ContentStatus | 'all' => {
  const status = typeof value === 'string' ? value : 'all'
  if (!['all', 'draft', 'published'].includes(status)) throw apiError(400, 'VALIDATION_ERROR', 'Status filter is invalid.')
  return status as ContentStatus | 'all'
}

export const validateSearchQuery = (value: unknown) => {
  const search = typeof value === 'string' ? value.trim() : ''
  if (search.length > 100) throw apiError(400, 'VALIDATION_ERROR', 'Search is too long.')
  return search
}

export const validateReorderIds = (value: unknown) => {
  if (!isObject(value) || !Array.isArray(value.ids) || value.ids.length === 0 || value.ids.length > 500 || value.ids.some((id) => typeof id !== 'string' || !uuidPattern.test(id))) {
    throw apiError(400, 'VALIDATION_ERROR', 'FAQ reorder payload is invalid.')
  }
  if (new Set(value.ids).size !== value.ids.length) throw apiError(400, 'VALIDATION_ERROR', 'FAQ reorder ids must be unique.')
  return value.ids as string[]
}
