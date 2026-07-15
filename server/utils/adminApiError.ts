import { setResponseStatus, type H3Event } from 'h3'

type AdminApiErrorStatus = 400 | 401 | 403 | 503

const messages: Record<AdminApiErrorStatus, string> = {
  400: 'Invalid request.',
  401: 'Authentication required.',
  403: 'Administrator access required.',
  503: 'Service temporarily unavailable.'
}

export const sendAdminApiError = (event: H3Event, statusCode: AdminApiErrorStatus) => {
  const message = messages[statusCode]
  setResponseStatus(event, statusCode, message)
  return { error: message }
}

export const normalizeAdminApiStatus = (error: unknown): AdminApiErrorStatus => {
  const statusCode = getHttpStatusCode(error)
  if (statusCode === 400 || statusCode === 401 || statusCode === 403) return statusCode
  return 503
}
