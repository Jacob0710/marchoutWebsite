import type { APIRequestContext } from '@playwright/test'

export const deleteActivity = async (request: APIRequestContext, id: string, origin: string) => {
  const response = await request.delete(`/api/admin/activities/${id}`, {
    headers: { origin }
  })
  if (![200, 404].includes(response.status())) {
    throw new Error(`Fixture cleanup failed for ${id}: ${response.status()} ${(await response.text()).slice(0, 200)}`)
  }
}
