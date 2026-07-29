const token = process.env.GITHUB_TOKEN || ''
const repository = process.env.GITHUB_REPOSITORY || ''
const releaseSha = process.env.PHASE12_RELEASE_SHA || ''
const stagingRunId = process.env.PHASE12_STAGING_RUN_ID || ''
const approvalIssue = process.env.PHASE12_APPROVAL_ISSUE || ''
const [owner] = repository.split('/')

const assert = (condition, message) => {
  if (!condition) throw new Error(message)
}
assert(token && repository && /^[0-9a-f]{40}$/.test(releaseSha), 'GitHub release verification inputs are incomplete.')
assert(/^\d+$/.test(stagingRunId) && /^\d+$/.test(approvalIssue), 'Staging run and approval issue must be numeric.')

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

const run = await api(`/actions/runs/${stagingRunId}`)
assert(run.head_sha === releaseSha, 'Staging workflow commit does not match the release commit.')
assert(run.conclusion === 'success', 'Staging workflow is not successful.')
assert(String(run.path).endsWith('/phase12-staging-e2e.yml'), 'Referenced run is not the Phase 12 staging workflow.')

const issue = await api(`/issues/${approvalIssue}`)
assert(issue.labels.some(label => label.name === 'phase12-release-approved'), 'Approval issue lacks the release approval label.')
const comments = await api(`/issues/${approvalIssue}/comments?per_page=100`)
const marker = `PHASE12-APPROVED ${releaseSha}`
const approval = [issue, ...comments].find(item =>
  item.user?.login?.toLowerCase() === owner.toLowerCase() && String(item.body || '').includes(marker)
)
assert(approval, 'Repository owner approval marker is missing.')

const checks = await api(`/commits/${releaseSha}/check-runs?per_page=100`)
const required = String(process.env.PHASE12_REQUIRED_CHECKS || 'quality,phase12-quality,Vercel')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean)
for (const name of required) {
  const check = checks.check_runs.find(item => item.name === name)
  assert(check?.conclusion === 'success', `Required check ${name} is not successful.`)
}

console.log(JSON.stringify({
  status: 'passed',
  releaseSha,
  stagingRunId: Number(stagingRunId),
  stagingConclusion: run.conclusion,
  approvalIssue: Number(approvalIssue),
  approvalAuthor: approval.user.login,
  requiredChecks: required
}, null, 2))
