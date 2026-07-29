import type { SupabaseClient } from '@supabase/supabase-js'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import {
  apiError,
  internalApiError,
  isUniqueViolation
} from '~/server/utils/apiErrors'
import {
  getAdminActivity,
  mapAdminActivity,
  mapAdminActivityListRow,
  requireUuid,
  toActivityDatabasePatch
} from '~/server/utils/activityApi'
import {
  validateActivityPayload,
  validatePublishable,
  validateVideoPayload
} from '~/server/utils/activityValidation'

beforeAll(() => {
  vi.stubGlobal('apiError', apiError)
  vi.stubGlobal('internalApiError', internalApiError)
})

const activityRow = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Phase 12 activity',
  slug: 'phase-12-activity',
  academic_year: 115,
  activity_type: 'project',
  event_date: '2026-07-30',
  location: 'Taipei',
  participants_count: 12,
  result_summary: 'A verified result',
  content: 'Verified content',
  status: 'draft',
  is_featured: false,
  tags: ['phase12'],
  cover_asset_id: '33333333-3333-4333-8333-333333333333',
  cover_image_url: null,
  video_url: null,
  published_at: null,
  created_at: '2026-07-30T00:00:00Z',
  updated_at: '2026-07-30T00:00:00Z',
  assets: [
    {
      id: '22222222-2222-4222-8222-222222222222',
      activity_id: '11111111-1111-4111-8111-111111111111',
      kind: 'attachment',
      storage_bucket: 'activity-assets',
      storage_path: 'phase12/file.pdf',
      original_name: 'evidence.pdf',
      mime_type: 'application/pdf',
      size_bytes: 20,
      alt_text: null,
      sort_order: 2,
      created_at: '2026-07-30T00:00:00Z',
      updated_at: '2026-07-30T00:00:00Z'
    },
    {
      id: '33333333-3333-4333-8333-333333333333',
      activity_id: '11111111-1111-4111-8111-111111111111',
      kind: 'image',
      storage_bucket: 'activity-assets',
      storage_path: 'phase12/cover.png',
      original_name: 'cover.png',
      mime_type: 'image/png',
      size_bytes: '30',
      alt_text: 'Verified cover',
      sort_order: 1,
      created_at: '2026-07-30T00:00:00Z',
      updated_at: '2026-07-30T00:00:00Z'
    }
  ],
  videos: [
    {
      id: '55555555-5555-4555-8555-555555555555',
      activity_id: '11111111-1111-4111-8111-111111111111',
      url: 'https://www.youtube.com/watch?v=abcDEF123',
      title: 'Evidence',
      sort_order: 1,
      created_at: '2026-07-30T00:00:00Z',
      updated_at: '2026-07-30T00:00:00Z'
    }
  ]
}

const fieldErrors = (operation: () => unknown) => {
  try {
    operation()
    throw new Error('Expected validation error')
  } catch (error) {
    return Reflect.get(Reflect.get(error as object, 'data') as object, 'fieldErrors') as Record<string, string[]>
  }
}

describe('activity validation integration', () => {
  it('normalizes a complete activity payload', () => {
    const result = validateActivityPayload({
      title: '  Phase 12  ',
      slug: 'phase-12',
      academicYear: 115,
      activityType: 'project',
      eventDate: '2026-07-30',
      location: '',
      participantsCount: 0,
      resultSummary: ' Result ',
      content: ' Content ',
      isFeatured: true,
      tags: ['e2e', ' e2e ', 'release']
    }, true)

    expect(result.values).toMatchObject({
      title: 'Phase 12',
      location: null,
      resultSummary: 'Result',
      tags: ['e2e', 'release']
    })
    expect(result.provided.size).toBe(11)
  })

  it('rejects unknown, malformed, and empty patches with field evidence', () => {
    const errors = fieldErrors(() => validateActivityPayload({
      unknown: true,
      title: '',
      slug: 'Not Valid',
      academicYear: 0,
      activityType: 'invalid',
      eventDate: '2026-99-99',
      participantsCount: -1,
      isFeatured: 'yes',
      tags: ['']
    }))
    expect(Object.keys(errors)).toEqual(expect.arrayContaining([
      'unknown', 'title', 'slug', 'academicYear', 'activityType',
      'eventDate', 'participantsCount', 'isFeatured', 'tags'
    ]))
    expect(() => validateActivityPayload({})).toThrow(/No editable fields/)
    expect(() => validateActivityPayload(null)).toThrow(/Invalid activity payload/)
  })

  it('enforces publish readiness and video mutation rules', () => {
    expect(() => validatePublishable({
      title: 'Ready',
      slug: 'ready-activity',
      academic_year: 115,
      activity_type: 'project',
      event_date: '2026-07-30',
      location: 'Taipei',
      participants_count: 1,
      result_summary: 'Result',
      content: 'Content'
    })).not.toThrow()
    expect(() => validatePublishable({
      title: '',
      slug: null,
      academic_year: null,
      activity_type: null,
      event_date: null,
      location: null,
      participants_count: -1,
      result_summary: null,
      content: null
    })).toThrow(/not ready/)

    expect(validateVideoPayload({
      url: 'https://www.youtube.com/watch?v=abcDEF123',
      title: '',
      sortOrder: 0
    })).toEqual({
      url: 'https://www.youtube.com/watch?v=abcDEF123',
      title: null,
      sortOrder: 0
    })
    expect(() => validateVideoPayload({ url: 'http://example.test' })).toThrow(/HTTPS/)
    expect(() => validateVideoPayload({}, true)).toThrow(/No editable video fields/)
  })
})

describe('administrator activity mapping and data access', () => {
  it('maps ordered private assets and safe video embeds', () => {
    const result = mapAdminActivity(activityRow as unknown as Parameters<typeof mapAdminActivity>[0])
    expect(result.assets.map(asset => asset.id)).toEqual([
      '33333333-3333-4333-8333-333333333333',
      '22222222-2222-4222-8222-222222222222'
    ])
    expect(result.assets[0]).toMatchObject({
      fileUrl: '/api/admin/activity-assets/33333333-3333-4333-8333-333333333333/file',
      isCover: true,
      sizeBytes: 30
    })
    expect(result.videos[0].embedUrl).toBe('https://www.youtube-nocookie.com/embed/abcDEF123')
    expect(mapAdminActivityListRow(activityRow as unknown as Parameters<typeof mapAdminActivityListRow>[0]))
      .toMatchObject({ assetCount: 2, imageCount: 1, attachmentCount: 1, videoCount: 1 })
  })

  it('validates identifiers and maps only editable database columns', () => {
    expect(requireUuid(activityRow.id)).toBe(activityRow.id)
    expect(() => requireUuid('not-a-uuid', 'activity')).toThrow(/activity not found/)
    expect(toActivityDatabasePatch({
      academicYear: 115,
      participantsCount: 8,
      unknown: 'discard'
    })).toEqual({ academic_year: 115, participants_count: 8 })
  })

  it('maps successful reads and shields database error details', async () => {
    const client = (result: { data: unknown; error: unknown }) => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => result)
          }))
        }))
      }))
    }) as unknown as SupabaseClient

    await expect(getAdminActivity(client({ data: activityRow, error: null }), activityRow.id))
      .resolves.toMatchObject({ id: activityRow.id })
    await expect(getAdminActivity(client({ data: null, error: null }), activityRow.id))
      .rejects.toMatchObject({ statusCode: 404 })
    await expect(getAdminActivity(client({ data: null, error: { message: 'database secret' } }), activityRow.id))
      .rejects.toMatchObject({ statusCode: 500, statusMessage: 'The request could not be completed.' })
  })
})

describe('safe API error primitives', () => {
  it('keeps stable codes, generic internals, and unique-violation detection', () => {
    expect(apiError(409, 'CONFLICT', 'Conflict').data).toMatchObject({ statusCode: 409, code: 'CONFLICT' })
    expect(internalApiError()).toMatchObject({ statusCode: 500, statusMessage: 'The request could not be completed.' })
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
    expect(isUniqueViolation({ code: 'other' })).toBe(false)
    expect(isUniqueViolation(null)).toBe(false)
  })
})
