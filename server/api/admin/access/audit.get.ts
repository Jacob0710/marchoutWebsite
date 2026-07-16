import { defineEventHandler, getQuery, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)
  const limit = parseAuditLimit(query.limit)
  const cursor = parseAuditCursor(query.cursor)
  const action = parseAuditAction(query.action)
  if (limit === null || cursor === null || action === null) throw apiError(400, 'VALIDATION_ERROR', 'Invalid audit filter.')

  const { data, error } = await supabase.rpc('list_admin_access_audit_logs', {
    p_limit: limit,
    p_cursor_created_at: cursor?.createdAt,
    p_cursor_id: cursor?.id,
    p_action: action
  })
  if (error) throwAdminAccessRpcError(error)
  const auditLogs = (data ?? []).map((row: unknown) => mapAdminAccessAuditLog(row as Record<string, unknown>))
  const last = auditLogs.at(-1)
  return {
    auditLogs,
    nextCursor: auditLogs.length === limit && last ? `${last.createdAt}|${last.id}` : null
  }
})
