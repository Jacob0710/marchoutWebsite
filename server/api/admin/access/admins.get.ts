import { defineEventHandler, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const { data, error } = await supabase.rpc('list_admin_accounts')
  if (error) throwAdminAccessRpcError(error)
  return { admins: (data ?? []).map((row: unknown) => mapAdminAccount(row as Record<string, unknown>)) }
})
