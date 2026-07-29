import { describe, expect, it } from 'vitest'
import { activitySlugPattern, isHttpsUrl, toActivitySlug, toSafeVideoEmbedUrl } from '~/shared/activityRules'
import { contentSlugPattern, formatFileSize, isSafeHttpsUrl, toContentSlug, uuidPattern } from '~/shared/contentRules'
import { toCsv } from '~/utils/csv'
import { createSlug } from '~/utils/slug'

describe('slug rules', () => {
  it('normalizes public Unicode slugs without leading separators', () => {
    expect(createSlug('  Hello, 世界!  ')).toBe('hello-世界')
  })

  it('normalizes admin slugs to the ASCII contract', () => {
    expect(toActivitySlug(' Café / Project 2026 ')).toBe('cafe-project-2026')
    expect(toContentSlug(' News -- Item 42 ')).toBe('news-item-42')
    expect(activitySlugPattern.test('valid-activity-42')).toBe(true)
    expect(contentSlugPattern.test('Invalid--Slug')).toBe(false)
  })

  it('recognizes only structurally valid content UUIDs', () => {
    expect(uuidPattern.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
    expect(uuidPattern.test('550e8400-e29b-01d4-a716-446655440000')).toBe(false)
  })
})

describe('URL rules', () => {
  it('accepts HTTPS and rejects unsafe or malformed URLs', () => {
    expect(isHttpsUrl('https://example.com/file')).toBe(true)
    expect(isHttpsUrl('http://example.com/file')).toBe(false)
    expect(isHttpsUrl('not a URL')).toBe(false)
    expect(isSafeHttpsUrl('')).toBe(true)
    expect(isSafeHttpsUrl('https://example.com')).toBe(true)
    expect(isSafeHttpsUrl('javascript:alert(1)')).toBe(false)
  })

  it('maps supported video hosts to privacy-aware embed URLs', () => {
    expect(toSafeVideoEmbedUrl('https://youtu.be/abcDEF123'))
      .toBe('https://www.youtube-nocookie.com/embed/abcDEF123')
    expect(toSafeVideoEmbedUrl('https://www.youtube.com/watch?v=abcDEF123'))
      .toBe('https://www.youtube-nocookie.com/embed/abcDEF123')
    expect(toSafeVideoEmbedUrl('https://m.youtube.com/embed/abcDEF123'))
      .toBe('https://www.youtube-nocookie.com/embed/abcDEF123')
    expect(toSafeVideoEmbedUrl('https://player.vimeo.com/video/123456'))
      .toBe('https://player.vimeo.com/video/123456')
  })

  it('rejects lookalike, insecure, and unsupported video hosts', () => {
    expect(toSafeVideoEmbedUrl('https://youtube.com.example.test/watch?v=abcDEF123')).toBeNull()
    expect(toSafeVideoEmbedUrl('http://youtube.com/watch?v=abcDEF123')).toBeNull()
    expect(toSafeVideoEmbedUrl('https://example.com/video/123456')).toBeNull()
    expect(toSafeVideoEmbedUrl('https://youtu.be/x')).toBeNull()
  })
})

describe('formatting helpers', () => {
  it('escapes CSV formulas as data while preserving CSV structure', () => {
    const csv = toCsv([
      { title: 'plain', note: null, enabled: true },
      { title: 'comma, quote"', note: 'line 1\nline 2', enabled: false }
    ], ['title', 'note', 'enabled'])

    expect(csv).toBe([
      'title,note,enabled',
      'plain,,true',
      '"comma, quote""","line 1',
      'line 2",false'
    ].join('\n'))
  })

  it('formats finite byte sizes', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(Number.NaN)).toBe('0 B')
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5.0 MB')
  })
})
