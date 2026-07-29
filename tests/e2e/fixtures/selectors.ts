export const navigationLinks = [
  { name: '關於我們', path: '/about' },
  { name: '活動成果', path: '/activities' },
  { name: '年度資料', path: '/years' },
  { name: '聯絡', path: '/contact' }
] as const

export const securityHeaders = [
  'content-security-policy-report-only',
  'x-content-type-options',
  'referrer-policy',
  'permissions-policy',
  'x-frame-options'
] as const
