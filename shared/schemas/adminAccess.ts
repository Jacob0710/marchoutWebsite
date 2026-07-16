import { adminAccessActions, type AcceptAdminInvitationInput, type AdminAccessAction, type CreateAdminInvitationInput, type UpdateAdminAccessInput } from '~/types/adminAccess'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const tokenPattern = /^[0-9a-f]{64}$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const hasOnlyKeys = (value: Record<string, unknown>, allowed: string[]) =>
  Object.keys(value).every((key) => allowed.includes(key))

export const normalizeAdminEmail = (value: string) => value.trim().toLowerCase()

export const parseCreateAdminInvitation = (value: unknown): CreateAdminInvitationInput | null => {
  if (!isObject(value) || !hasOnlyKeys(value, ['email', 'expiresInDays'])) return null
  if (typeof value.email !== 'string') return null
  const email = normalizeAdminEmail(value.email)
  if (!emailPattern.test(email) || email.length > 254) return null

  const expiresInDays = value.expiresInDays === undefined ? 7 : value.expiresInDays
  if (!Number.isInteger(expiresInDays) || Number(expiresInDays) < 1 || Number(expiresInDays) > 30) return null
  return { email, expiresInDays: Number(expiresInDays) }
}

export const parseUpdateAdminAccess = (value: unknown): UpdateAdminAccessInput | null => {
  if (!isObject(value) || !hasOnlyKeys(value, ['isActive']) || typeof value.isActive !== 'boolean') return null
  return { isActive: value.isActive }
}

export const parseAcceptAdminInvitation = (value: unknown): AcceptAdminInvitationInput | null => {
  if (!isObject(value) || !hasOnlyKeys(value, ['email', 'password', 'token'])) return null
  if (typeof value.email !== 'string' || typeof value.password !== 'string' || typeof value.token !== 'string') return null
  const email = normalizeAdminEmail(value.email)
  if (!emailPattern.test(email) || email.length > 254) return null
  if (value.password.length < 6 || value.password.length > 256) return null
  if (!tokenPattern.test(value.token)) return null
  return { email, password: value.password, token: value.token }
}

export const parseAdminUuid = (value: unknown) => typeof value === 'string' && uuidPattern.test(value) ? value : null

export const parseInvitationStatus = (value: unknown) => {
  const status = typeof value === 'string' ? value : 'all'
  return ['all', 'pending', 'accepted', 'revoked', 'expired'].includes(status) ? status : null
}

export const parseAuditAction = (value: unknown): AdminAccessAction | null | undefined => {
  if (value === undefined || value === '') return undefined
  return typeof value === 'string' && adminAccessActions.includes(value as AdminAccessAction)
    ? value as AdminAccessAction
    : null
}

export const parseAuditLimit = (value: unknown) => {
  if (value === undefined || value === '') return 50
  if (typeof value !== 'string' || !/^\d{1,3}$/.test(value)) return null
  const limit = Number(value)
  return limit >= 1 && limit <= 100 ? limit : null
}

export const parseAuditCursor = (value: unknown) => {
  if (value === undefined || value === '') return undefined
  if (typeof value !== 'string') return null
  const separator = value.lastIndexOf('|')
  if (separator < 1) return null
  const createdAt = value.slice(0, separator)
  const idText = value.slice(separator + 1)
  if (Number.isNaN(Date.parse(createdAt)) || !/^\d+$/.test(idText)) return null
  const id = Number(idText)
  return Number.isSafeInteger(id) && id > 0 ? { createdAt, id } : null
}
