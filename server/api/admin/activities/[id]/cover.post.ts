import { defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase, user } = await requireAdmin(event)
  requireSameOrigin(event)
  const id = requireUuid(getRouterParam(event, 'id'), 'Activity')
  const body = await readBody<unknown>(event)
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => key !== 'assetId')) {
    throw apiError(400, 'VALIDATION_ERROR', 'Invalid cover payload.')
  }
  const rawAssetId = Reflect.get(body, 'assetId')
  const assetId = rawAssetId === null ? null : requireUuid(typeof rawAssetId === 'string' ? rawAssetId : undefined, 'Asset')
  if (assetId) {
    const { data, error } = await supabase.from('activity_assets').select('id').eq('id', assetId).eq('activity_id', id).eq('kind', 'image').maybeSingle()
    if (error) throw internalApiError()
    if (!data) throw apiError(404, 'NOT_FOUND', 'Image asset not found.')
  }
  const { data, error } = await supabase.from('activities').update({
    cover_asset_id: assetId, updated_at: new Date().toISOString(), updated_by: user.id
  }).eq('id', id).select('id').maybeSingle()
  if (error) throw internalApiError()
  if (!data) throw apiError(404, 'NOT_FOUND', 'Activity not found.')
  return { activity: await getAdminActivity(supabase, id) }
})
