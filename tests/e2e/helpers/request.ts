import type { BrowserContext } from '@playwright/test'

export const requestWithOrigin = async (
  context: BrowserContext,
  path: string,
  origin: string,
  data: unknown = {}
) => context.request.post(path, {
  headers: { origin, 'content-type': 'application/json' },
  data
})
