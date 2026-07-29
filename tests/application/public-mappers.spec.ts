import { describe, expect, it } from 'vitest'
import {
  fallbackActivityImageUrl,
  mapActivityFromRow,
  mapActivityImageFromRow,
  mapActivityToPayload,
  mapFaqFromRow,
  mapFaqToPayload,
  mapFileFromRow,
  mapFileToPayload,
  mapPostFromRow,
  mapPostToPayload,
  mapPublicAssetFile,
  mapPublicAssetImage,
  mapPublicVideo,
  mapSettingsFromRow,
  mapSettingsToPayload
} from '~/utils/supabaseMappers'

describe('public Supabase boundary mappers', () => {
  it('maps activities through application-owned proxy URLs and defaults', () => {
    const row = {
      id: 'activity-id',
      title: 'Activity',
      slug: 'activity',
      academic_year: 115,
      activity_type: 'project',
      event_date: null,
      location: null,
      participants_count: null,
      result_summary: null,
      content: null,
      cover_asset_id: 'cover-id',
      cover_image_url: null,
      video_url: 'https://youtu.be/abcDEF123',
      status: 'published',
      is_featured: true,
      tags: null,
      published_at: '2026-07-30T00:00:00Z'
    }
    const image = mapPublicAssetImage({ id: 'cover-id', alt_text: null, sort_order: 2 })
    const file = mapPublicAssetFile({
      id: 'file-id',
      original_name: 'evidence.pdf',
      mime_type: 'application/pdf',
      size_bytes: 42
    })
    const video = mapPublicVideo({
      id: 'video-id',
      url: 'https://www.youtube.com/watch?v=abcDEF123',
      title: null,
      sort_order: 1
    })
    const activity = mapActivityFromRow(
      row as unknown as Parameters<typeof mapActivityFromRow>[0],
      [image],
      [file],
      [video]
    )

    expect(activity).toMatchObject({
      coverImageUrl: '/api/public/activity-assets/cover-id',
      videoUrl: 'https://www.youtube-nocookie.com/embed/abcDEF123',
      eventDate: '',
      participantsCount: 0,
      tags: []
    })
    expect(image.imageUrl).toBe('/api/public/activity-assets/cover-id')
    expect(file.url).toBe('/api/public/activity-assets/file-id?download=1')
    expect(video).toMatchObject({
      title: '活動影片',
      embedUrl: 'https://www.youtube-nocookie.com/embed/abcDEF123'
    })
  })

  it('maps legacy image and payload fallbacks without leaking database names', () => {
    expect(mapActivityImageFromRow({
      id: 'image',
      activity_id: 'activity',
      image_url: '/image.png',
      caption: null,
      sort_order: null
    })).toEqual({ id: 'image', imageUrl: '/image.png', caption: '', sortOrder: 0 })

    expect(mapActivityFromRow({
      id: 'activity',
      title: 'No cover',
      slug: 'no-cover',
      academic_year: 115,
      activity_type: 'project',
      event_date: null,
      location: null,
      participants_count: null,
      result_summary: null,
      content: null,
      cover_asset_id: null,
      cover_image_url: null,
      video_url: null,
      status: 'draft',
      is_featured: false,
      tags: null,
      published_at: null
    }).coverImageUrl).toBe(fallbackActivityImageUrl)

    expect(mapActivityToPayload({ title: 'Draft' })).toMatchObject({
      title: 'Draft',
      event_date: null,
      participants_count: 0,
      status: 'draft',
      is_featured: false,
      tags: []
    })
  })

  it('maps post, file, FAQ, and settings records in both directions', () => {
    expect(mapPostFromRow({
      id: 'post',
      title: 'Post',
      slug: 'post',
      excerpt: null,
      content: null,
      cover_image_url: null,
      status: 'draft',
      published_at: null
    })).toMatchObject({ excerpt: '', publishedAt: '' })
    expect(mapPostToPayload({ title: 'Post' })).toMatchObject({
      title: 'Post', excerpt: null, status: 'draft', published_at: null
    })

    expect(mapFileFromRow({
      id: 'file',
      title: 'File',
      file_url: '/file',
      file_type: null,
      academic_year: null,
      activity_id: null,
      category: null,
      description: null,
      created_at: '2026-07-30T00:00:00Z'
    })).toMatchObject({ fileType: '', category: '', description: '' })
    expect(mapFileToPayload({ title: 'File', fileUrl: '/file' })).toMatchObject({
      file_type: null, academic_year: null, category: null
    })

    expect(mapFaqFromRow({
      id: 'faq',
      question: 'Q',
      answer: 'A',
      sort_order: null,
      is_visible: true
    })).toMatchObject({ sortOrder: 0, isVisible: true })
    expect(mapFaqToPayload({ question: 'Q', answer: 'A' })).toMatchObject({
      sort_order: 0, is_visible: true
    })

    const settings = mapSettingsFromRow({
      id: 'settings',
      site_name: 'Site',
      logo_url: null,
      club_name_zh: null,
      club_name_en: null,
      slogan: null,
      facebook_url: null,
      instagram_url: null,
      contact_text: null,
      email: null,
      phone: null,
      map_locations: [{ title: 'Taipei', address: 'Address', mapUrl: 'https://example.test' }]
    })
    expect(settings.siteName).toBe('Site')
    expect(settings.locations).toHaveLength(1)
    expect(mapSettingsToPayload(settings)).toMatchObject({
      site_name: 'Site',
      map_locations: settings.locations
    })
  })
})
