import { defineEventHandler, getRouterParam, readBody, setResponseHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const { supabase } = await requireAdmin(event)
  requireSameOrigin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store, max-age=0')
  const redirectKey = requireEditorialRedirectKey(getRouterParam(event, 'sourceKey'))
  const input = parseRedirectVerification(await readBody<unknown>(event))
  const allowedOrigins = String(useRuntimeConfig(event).phase10VerificationOrigins || '')
    .split(',').map((value) => value.trim()).filter(Boolean)
    .map((value) => { try { return new URL(value).origin } catch { return '' } })
    .filter(Boolean)
  if (!allowedOrigins.includes(input.verifiedOrigin) || new URL(input.verifiedOrigin).hostname.endsWith('.invalid')) {
    throw apiError(400, 'INVALID_HTTP_EVIDENCE', 'The verification origin is not approved for this deployment.')
  }
  const { data: redirects, error: listError } = await supabase.rpc('phase10_list_redirects')
  throwEditorialRpcError(listError)
  const redirect = (camelizeEditorial(redirects ?? []) as Array<{
    redirectKey: string; targetPath: string | null; targetVersion: string | null; targetVerified: boolean
    verifiedOrigin: string | null; verifiedFinalUrl: string | null; verifiedFinalStatus: number | null; verifiedHops: number | null
  }>).find((item) => item.redirectKey === redirectKey)
  if (!redirect?.targetPath) throw apiError(404, 'REDIRECT_NOT_FOUND', 'Redirect not found.')
  const targetUrl = new URL(redirect.targetPath, `${input.verifiedOrigin}/`)
  if (redirect.targetVerified && redirect.verifiedOrigin === input.verifiedOrigin
    && redirect.verifiedFinalUrl === targetUrl.href && redirect.verifiedFinalStatus === 200
    && redirect.verifiedHops === 1 && redirect.targetVersion === input.targetVersion) {
    return { redirect, idempotent: true }
  }
  let response: Response
  try {
    response = await fetch(targetUrl, {
      method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { 'user-agent': 'phase10-server-target-verifier/1.0' }
    })
  } catch {
    throw apiError(409, 'PUBLIC_TARGET_EVIDENCE_REQUIRED', 'The public target could not be reached.')
  }
  await response.body?.cancel()
  if (response.status !== 200 || response.headers.has('location')) {
    throw apiError(409, 'PUBLIC_TARGET_EVIDENCE_REQUIRED', 'The public target must respond directly with 200.')
  }
  const { data, error } = await supabase.rpc('phase10_record_redirect_verification', {
    p_redirect_key: redirectKey,
    p_verified_origin: input.verifiedOrigin,
    p_final_url: targetUrl.href,
    p_final_status: 200,
    p_hops: 1,
    p_target_version: input.targetVersion,
    p_correlation_id: crypto.randomUUID()
  })
  throwEditorialRpcError(error)
  writeOperationalLog(event, { action: 'redirect_target_verification', result: 'passed', status: 200 })
  return { redirect: camelizeEditorial(data), idempotent: false }
})
