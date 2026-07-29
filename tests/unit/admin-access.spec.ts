import { describe, expect, it } from 'vitest'
import {
  normalizeAdminEmail,
  parseAcceptAdminInvitation,
  parseAdminUuid,
  parseAuditAction,
  parseAuditCursor,
  parseAuditLimit,
  parseCreateAdminInvitation,
  parseInvitationStatus,
  parseUpdateAdminAccess
} from '~/shared/schemas/adminAccess'

const uuid = '550e8400-e29b-41d4-a716-446655440000'
const token = 'a'.repeat(64)

describe('administrator access schemas', () => {
  it('normalizes and validates invitation creation', () => {
    expect(normalizeAdminEmail(' Admin@Example.COM ')).toBe('admin@example.com')
    expect(parseCreateAdminInvitation({ email: ' Admin@Example.COM ' }))
      .toEqual({ email: 'admin@example.com', expiresInDays: 7 })
    expect(parseCreateAdminInvitation({ email: 'admin@example.com', expiresInDays: 30 }))
      .toEqual({ email: 'admin@example.com', expiresInDays: 30 })
    expect(parseCreateAdminInvitation({ email: 'invalid', expiresInDays: 7 })).toBeNull()
    expect(parseCreateAdminInvitation({ email: 'admin@example.com', expiresInDays: 31 })).toBeNull()
    expect(parseCreateAdminInvitation({ email: 'admin@example.com', extra: true })).toBeNull()
  })

  it('validates invitation acceptance without altering passwords', () => {
    expect(parseAcceptAdminInvitation({
      email: 'ADMIN@example.com',
      password: 'secret-value',
      token
    })).toEqual({
      email: 'admin@example.com',
      password: 'secret-value',
      token
    })
    expect(parseAcceptAdminInvitation({ email: 'admin@example.com', password: 'short', token })).toBeNull()
    expect(parseAcceptAdminInvitation({ email: 'admin@example.com', password: 'long-enough', token: 'bad' })).toBeNull()
  })

  it('validates updates and identifiers', () => {
    expect(parseUpdateAdminAccess({ isActive: false })).toEqual({ isActive: false })
    expect(parseUpdateAdminAccess({ isActive: 'false' })).toBeNull()
    expect(parseAdminUuid(uuid)).toBe(uuid)
    expect(parseAdminUuid('not-a-uuid')).toBeNull()
  })

  it('parses bounded filters and stable audit cursors', () => {
    expect(parseInvitationStatus(undefined)).toBe('all')
    expect(parseInvitationStatus('accepted')).toBe('accepted')
    expect(parseInvitationStatus('unknown')).toBeNull()
    expect(parseAuditAction(undefined)).toBeUndefined()
    expect(parseAuditAction('')).toBeUndefined()
    expect(parseAuditAction('unknown')).toBeNull()
    expect(parseAuditLimit(undefined)).toBe(50)
    expect(parseAuditLimit('1')).toBe(1)
    expect(parseAuditLimit('100')).toBe(100)
    expect(parseAuditLimit('101')).toBeNull()
    expect(parseAuditLimit(10)).toBeNull()
    expect(parseAuditCursor(undefined)).toBeUndefined()
    expect(parseAuditCursor('2026-07-29T01:02:03.000Z|42'))
      .toEqual({ createdAt: '2026-07-29T01:02:03.000Z', id: 42 })
    expect(parseAuditCursor('not-a-date|42')).toBeNull()
    expect(parseAuditCursor('2026-07-29T01:02:03.000Z|0')).toBeNull()
  })
})
