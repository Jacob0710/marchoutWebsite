import { defineEventHandler, getRouterParam, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  const assetId = requireUuid(getRouterParam(event, 'assetId'), 'Asset')
  const body = await readBody<unknown>(event)
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw apiError(400, 'VALIDATION_ERROR', 'Invalid asset payload.')
  const input = body as Record<string, unknown>
  if (Object.keys(input).some((key) => !['altText', 'sortOrder'].includes(key))) throw apiError(400, 'VALIDATION_ERROR', 'Asset payload contains an unsupported field.')
  const patch: { alt_text?: string | null; sort_order?: number } = {}
  if ('altText' in input) {
    if (input.altText !== null && typeof input.altText !== 'string') throw apiError(400, 'VALIDATION_ERROR', 'Alt text is invalid.')
    const altText = typeof input.altText === 'string' ? input.altText.trim() : null
    if (altText && altText.length > 500) throw apiError(400, 'VALIDATION_ERROR', 'Alt text is too long.')
    patch.alt_text = altText || null
  }
  if ('sortOrder' in input) {
    if (!Number.isInteger(input.sortOrder) || Number(input.sortOrder) < 0) throw apiError(400, 'VALIDATION_ERROR', 'Sort order must be a non-negative integer.')
    patch.sort_order = Number(input.sortOrder)
  }
  if (!Object.keys(patch).length) throw apiError(400, 'VALIDATION_ERROR', 'No editable asset fields were provided.')
  const { data, error } = await supabase.from('activity_assets').update(patch).eq('id', assetId).select('activity_id').maybeSingle()
  if (error) throw internalApiError()
  if (!data) throw apiError(404, 'NOT_FOUND', 'Asset not found.')
  const activity = await getAdminActivity(supabase, data.activity_id)
  return { asset: activity.assets.find((asset) => asset.id === assetId)! }
})
