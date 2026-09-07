import assert from 'node:assert/strict'
import test from 'node:test'
import { hasExactApprovalMarker, readGithubArrayPages, verifyRequiredChecks } from '../../scripts/phase12/lib/github-evidence.mjs'

const skippedChecks = (count, name, start) => Array.from({ length: count }, (_, offset) => ({
  id: start - offset,
  name,
  conclusion: 'skipped',
  completed_at: new Date(start - offset).toISOString()
}))

test('finds a successful exact-SHA check after more than three pages of skipped schedule checks', async () => {
  const qualityPages = [
    skippedChecks(100, 'quality', 5000),
    skippedChecks(100, 'quality', 4000),
    skippedChecks(100, 'quality', 3000),
    [...skippedChecks(92, 'quality', 2000), {
      id: 1,
      name: 'quality',
      conclusion: 'success',
      completed_at: new Date(1).toISOString(),
      details_url: 'https://example.test/quality'
    }]
  ]
  const api = async (path) => {
    if (path.includes('/statuses')) return []
    const page = Number(new URL(`https://api.test${path}`).searchParams.get('page'))
    return { check_runs: qualityPages[page - 1] || [] }
  }

  const [evidence] = await verifyRequiredChecks({ api, releaseSha: 'a'.repeat(40), required: ['quality'] })
  assert.equal(evidence.successful, true)
  assert.equal(evidence.checkConclusion, 'success')
})

test('does not let an older success hide a newer executed failure', async () => {
  const api = async (path) => path.includes('/statuses')
    ? [{ id: 3, context: 'quality', state: 'success', created_at: '2026-09-07T00:30:00Z' }]
    : { check_runs: [
        { id: 2, name: 'quality', conclusion: 'failure', completed_at: '2026-09-07T02:00:00Z' },
        { id: 1, name: 'quality', conclusion: 'success', completed_at: '2026-09-07T01:00:00Z' }
      ] }

  const [evidence] = await verifyRequiredChecks({ api, releaseSha: 'b'.repeat(40), required: ['quality'] })
  assert.equal(evidence.successful, false)
  assert.equal(evidence.checkConclusion, 'failure')
})

test('uses the latest status and paginates status evidence', async () => {
  const firstPage = Array.from({ length: 100 }, (_, index) => ({
    id: 1000 - index,
    context: `unrelated-${index}`,
    state: 'success',
    created_at: '2026-09-07T02:00:00Z'
  }))
  const api = async (path) => {
    const page = Number(new URL(`https://api.test${path}`).searchParams.get('page'))
    if (path.includes('/statuses')) return page === 1 ? firstPage : [{
      id: 1,
      context: 'Vercel – staging',
      state: 'success',
      created_at: '2026-09-07T01:00:00Z',
      target_url: 'https://example.test/deploy'
    }]
    return { check_runs: [] }
  }

  const [evidence] = await verifyRequiredChecks({ api, releaseSha: 'c'.repeat(40), required: ['Vercel – staging'] })
  assert.equal(evidence.successful, true)
  assert.equal(evidence.statusState, 'success')
})

test('reads all issue or comment pages and requires an exact marker line', async () => {
  const api = async (path) => Number(new URL(`https://api.test${path}`).searchParams.get('page')) === 1
    ? Array.from({ length: 100 }, (_, number) => ({ number }))
    : [{ number: 101 }]
  const issues = await readGithubArrayPages(api, '/issues?state=all')
  assert.equal(issues.length, 101)

  const marker = `PHASE12-STAGING-APPROVED ${'d'.repeat(40)}`
  assert.equal(hasExactApprovalMarker(`approved: ${marker}` , marker), false)
  assert.equal(hasExactApprovalMarker(`context\n  ${marker}  \nmore context`, marker), true)
})
