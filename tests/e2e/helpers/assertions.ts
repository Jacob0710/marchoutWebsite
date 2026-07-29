import { expect, type APIResponse, type Page } from '@playwright/test'
import { securityHeaders } from '../fixtures/selectors'

const sensitivePatterns = [
  /service[_-]?role/i,
  /postgres(?:ql)?:\/\/[^/\s]+:[^@\s]+@/i,
  /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
]

export const expectNoSensitiveText = async (response: APIResponse) => {
  const body = await response.text()
  for (const pattern of sensitivePatterns) expect(body).not.toMatch(pattern)
}

export const expectSecurityHeaders = (response: APIResponse) => {
  const headers = response.headers()
  for (const name of securityHeaders) expect(headers[name], `${name} header`).toBeTruthy()
  expect(headers['x-content-type-options']).toBe('nosniff')
  expect(headers['x-frame-options']).toBe('DENY')
}

export const observeBrowserProblems = (page: Page) => {
  const problems: string[] = []
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`))
  page.on('console', message => {
    const text = message.text()
    if (message.type() === 'error' || /hydration (?:mismatch|completed but contains mismatches)/i.test(text)) {
      problems.push(`${message.type()}: ${text}`)
    }
  })
  return problems
}

export const expectNoBrowserProblems = (problems: string[]) => {
  expect(problems, problems.join('\n')).toEqual([])
}

export const expectZhHantPage = async (page: Page) => {
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-Hant')
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
}
