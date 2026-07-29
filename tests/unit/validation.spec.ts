import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  validateActivityPayload,
  validatePublishable,
  validateVideoPayload
} from '~/server/utils/activityValidation'
import {
  requireContentUuid,
  validateFaqInput,
  validatePostInput,
  validateReorderIds,
  validateSearchQuery,
  validateStatusQuery
} from '~/server/utils/contentValidation'

beforeAll(() => {
  vi.stubGlobal('apiError', (
    statusCode: number,
    code: string,
    message: string,
    fieldErrors?: Record<string, string[]>
  ) => Object.assign(new Error(message), {
    statusCode,
    data: { code, fieldErrors }
  }))
})

describe('activity validation', () => {
  it('normalizes a valid create payload and deduplicates tags', () => {
    const result = validateActivityPayload({
      title: '  Summer Project  ',
      slug: 'summer-project',
      academicYear: 114,
      activityType: 'project',
      eventDate: '2026-07-29',
      location: ' Taipei ',
      participantsCount: 12,
      resultSummary: ' Result ',
      content: ' Content ',
      isFeatured: true,
      tags: [' service ', 'service']
    }, true)

    expect(result.values).toMatchObject({
      title: 'Summer Project',
      location: 'Taipei',
      tags: ['service']
    })
    expect(result.provided.has('title')).toBe(true)
  })

  it('rejects unsupported or empty patch fields', () => {
    expect(() => validateActivityPayload({ unsupported: true }))
      .toThrow(/validation failed/i)
    expect(() => validateActivityPayload({}))
      .toThrow(/No editable fields/)
  })

  it('enforces publish readiness and safe video input', () => {
    expect(() => validatePublishable({
      title: 'Title',
      slug: 'valid-slug',
      academic_year: 114,
      activity_type: 'regular',
      event_date: '2026-07-29',
      location: 'Taipei',
      participants_count: 0,
      result_summary: 'Summary',
      content: 'Content'
    })).not.toThrow()
    expect(() => validatePublishable({
      title: '',
      slug: 'Bad Slug',
      academic_year: 0,
      activity_type: 'unknown',
      event_date: null,
      location: null,
      participants_count: -1,
      result_summary: null,
      content: null
    })).toThrow(/not ready/)
    expect(validateVideoPayload({ url: 'https://youtu.be/abcDEF123', sortOrder: 0 }))
      .toEqual({ url: 'https://youtu.be/abcDEF123', sortOrder: 0 })
    expect(() => validateVideoPayload({ url: 'http://example.com/video' }))
      .toThrow(/HTTPS URL/)
  })
})

describe('core content validation', () => {
  it('normalizes valid posts and FAQ entries', () => {
    expect(validatePostInput({
      title: ' News ',
      slug: 'news-item',
      content: ' Body ',
      excerpt: '',
      coverAlt: ' Cover ',
      isFeatured: false
    })).toEqual({
      title: 'News',
      slug: 'news-item',
      content: 'Body',
      excerpt: '',
      coverAlt: 'Cover',
      isFeatured: false
    })
    expect(validateFaqInput({ question: ' Question? ', answer: ' Answer ', sortOrder: 0, isActive: true }))
      .toEqual({ question: 'Question?', answer: 'Answer', sortOrder: 0, isActive: true })
  })

  it('rejects unsafe identifiers, unsupported fields, and empty patches', () => {
    expect(() => requireContentUuid('not-a-uuid')).toThrow(/not found/)
    expect(requireContentUuid('550e8400-e29b-41d4-a716-446655440000'))
      .toBe('550e8400-e29b-41d4-a716-446655440000')
    expect(() => validatePostInput({ title: 'Title', slug: 'Bad Slug', content: 'Body' }))
      .toThrow(/Validation failed/)
    expect(() => validatePostInput({ unexpected: true }, true))
      .toThrow(/unsupported field/)
    expect(() => validateFaqInput({}, true)).toThrow(/No editable fields/)
  })

  it('bounds list queries and reorder requests', () => {
    expect(validateStatusQuery(undefined)).toBe('all')
    expect(validateStatusQuery('published')).toBe('published')
    expect(() => validateStatusQuery('archived')).toThrow(/Status filter is invalid/)
    expect(validateSearchQuery('  query  ')).toBe('query')
    expect(validateSearchQuery(undefined)).toBe('')
    expect(() => validateSearchQuery('x'.repeat(201))).toThrow(/Search is too long/)
    expect(validateReorderIds({
      ids: [
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-41d1-80b4-00c04fd430c8'
      ]
    })).toHaveLength(2)
    expect(() => validateReorderIds({
      ids: [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440000'
      ]
    })).toThrow(/must be unique/)
  })
})
