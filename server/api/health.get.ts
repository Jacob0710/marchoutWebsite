import { defineEventHandler, setResponseHeader } from 'h3'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store, max-age=0')
  return { status: 'ok' }
})
