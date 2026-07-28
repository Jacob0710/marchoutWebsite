import { defineEventHandler } from 'h3'

export default defineEventHandler((event) => {
  const startedAt = performance.now()
  initializeOperationalContext(event)
  event.node.res.once('finish', () => {
    writeOperationalLog(event, { status: event.node.res.statusCode, durationMs: performance.now() - startedAt })
  })
})
