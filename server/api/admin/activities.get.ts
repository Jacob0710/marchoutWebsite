import { defineEventHandler } from 'h3'
import type { ContentStatus } from '~/types/content'

interface ActivityDatabaseRow {
  id: string
  title: string
  slug: string
  status: ContentStatus
  event_date: string | null
  created_at: string
  updated_at: string
}

const activityColumns = 'id,title,slug,status,event_date,created_at,updated_at'

export default defineEventHandler(async (event) => {
  try {
    const { supabase } = await requireAdmin(event)
    const { data, error } = await supabase
      .from('activities')
      .select(activityColumns)
      .order('event_date', { ascending: false, nullsFirst: false })
      .order('id', { ascending: true })
      .returns<ActivityDatabaseRow[]>()

    if (error) return sendAdminApiError(event, 503)

    return {
      activities: (data ?? []).map((activity) => ({
        id: activity.id,
        title: activity.title,
        slug: activity.slug,
        status: activity.status,
        eventDate: activity.event_date,
        createdAt: activity.created_at,
        updatedAt: activity.updated_at
      }))
    }
  } catch (error) {
    return sendAdminApiError(event, normalizeAdminApiStatus(error))
  }
})
