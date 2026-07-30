import type { BrowserContext } from '@playwright/test'

export const requestWithOrigin = async (
  context: BrowserContext,
  path: string,
  method: 'PATCH' | 'POST',
  origin: string,
  data: unknown = {}
) => context.request.fetch(path, {
  method,
  headers: { origin, 'content-type': 'application/json' },
  data
})
