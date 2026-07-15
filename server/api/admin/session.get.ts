import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  try {
    const { user } = await requireAdmin(event)

    return {
      user: {
        email: user.email ?? '管理員'
      }
    }
  } catch (error) {
    return sendAdminApiError(event, normalizeAdminApiStatus(error))
  }
})
