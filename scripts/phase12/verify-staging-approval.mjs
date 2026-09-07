import { hasExactApprovalMarker, readGithubArrayPages, verifyRequiredChecks } from './lib/github-evidence.mjs'

const token = process.env.GITHUB_TOKEN || ''
const repository = process.env.GITHUB_REPOSITORY || ''
const releaseSha = process.env.PHASE12_RELEASE_SHA || ''
const requestedIssue = process.env.PHASE12_STAGING_APPROVAL_ISSUE || ''
const requestedPullRequest = process.env.PHASE12_PR_NUMBER || ''
const [owner] = repository.split('/')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}

assert(token && repository && /^[0-9a-f]{40}$/.test(releaseSha), 'Staging approval verification inputs are incomplete.')
assert(!requestedIssue || /^\d+$/.test(requestedIssue), 'Staging approval issue must be numeric.')
assert(!requestedPullRequest || /^\d+$/.test(requestedPullRequest), 'Staging pull request must be numeric.')

const api = async (path) => {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      authorization: `Bearer ${token}`,
      'x-github-api-version': '2022-11-28'
    },
    signal: AbortSignal.timeout(20_000)
  })
  if (!response.ok) throw new Error(`GitHub API ${path} returned ${response.status}.`)
  return response.json()
}

let target = 'protected-main'
let pullRequest
let approvedIssue
let approval

if (requestedPullRequest) {
  pullRequest = await api(`/pulls/${requestedPullRequest}`)
  assert(pullRequest.state === 'open', 'Pre-merge staging requires an open pull request.')
  assert(pullRequest.draft === true, 'Pre-merge staging requires the pull request to remain Draft.')
  assert(pullRequest.base?.ref === 'main', 'Pre-merge staging pull request must target main.')
  assert(pullRequest.head?.sha === releaseSha, 'Pre-merge staging SHA does not match the pull request head.')
  target = 'draft-pr'
} else {
  const marker = `PHASE12-STAGING-APPROVED ${releaseSha}`
  const candidates = requestedIssue
    ? [await api(`/issues/${requestedIssue}`)]
    : await readGithubArrayPages(api, '/issues?state=all&labels=phase12-staging-approved')

  for (const issue of candidates) {
    if (issue.pull_request || !issue.labels?.some(label => label.name === 'phase12-staging-approved')) continue
    const comments = await readGithubArrayPages(api, `/issues/${issue.number}/comments`)
    const match = [issue, ...comments].find(item =>
      item.user?.login?.toLowerCase() === owner.toLowerCase() && hasExactApprovalMarker(item.body, marker)
    )
    if (match) {
      approvedIssue = issue
      approval = match
      break
    }
  }
  assert(approval, 'Traceable repository-owner staging approval is missing for this commit.')
}

const required = String(process.env.PHASE12_REQUIRED_CHECKS || 'quality,phase12-quality,Vercel – marchout-staging')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)
const requiredCheckEvidence = await verifyRequiredChecks({ api, releaseSha, required })
for (const evidence of requiredCheckEvidence) {
  assert(evidence.successful, `Required check or status ${evidence.name} is not successful.`)
}

console.log(JSON.stringify({
  status: 'passed',
  target,
  releaseSha,
  ...(pullRequest ? { pullRequest: pullRequest.number, pullRequestDraft: pullRequest.draft } : {}),
  ...(approvedIssue ? { approvalIssue: approvedIssue.number, approvalAuthor: approval.user.login } : {}),
  requiredChecks: required,
  requiredCheckEvidence
}, null, 2))
