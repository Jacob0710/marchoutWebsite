import { defineEventHandler, setResponseHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const environment = String(config.phase10Environment || 'local')
  const releaseSha = String(process.env.VERCEL_GIT_COMMIT_SHA || config.phase12ReleaseSha || '')
  setResponseHeader(event, 'Cache-Control', 'no-store, max-age=0')
  setResponseHeader(event, 'X-App-Environment', environment)
  return { status: 'ok', environment, ...(releaseSha ? { releaseSha } : {}) }
})
