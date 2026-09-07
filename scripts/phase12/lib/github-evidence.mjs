const perPage = 100
const maxPages = 100

const pagePath = (path, page) => `${path}${path.includes('?') ? '&' : '?'}per_page=${perPage}&page=${page}`

export const readGithubArrayPages = async (api, path) => {
  const items = []
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await api(pagePath(path, page))
    if (!Array.isArray(response)) throw new Error(`GitHub API ${path} returned malformed paginated evidence.`)
    items.push(...response)
    if (response.length < perPage) return items
  }
  throw new Error(`GitHub API ${path} exceeded the ${maxPages}-page evidence limit.`)
}

const readCheckRuns = async (api, releaseSha, name) => {
  const runs = []
  const encodedName = encodeURIComponent(name)
  for (let page = 1; page <= maxPages; page += 1) {
    const response = await api(`/commits/${releaseSha}/check-runs?check_name=${encodedName}&filter=all&per_page=${perPage}&page=${page}`)
    if (!Array.isArray(response?.check_runs)) throw new Error(`GitHub check evidence for ${name} is malformed.`)
    runs.push(...response.check_runs.filter(item => item.name === name))
    if (response.check_runs.length < perPage) return runs
  }
  throw new Error(`GitHub check evidence for ${name} exceeded the ${maxPages}-page evidence limit.`)
}

const evidenceTime = item => Date.parse(item.completed_at || item.started_at || item.created_at || item.updated_at || '') || 0

const newestFirst = (left, right) => evidenceTime(right) - evidenceTime(left) || Number(right.id || 0) - Number(left.id || 0)

const latestDecisiveCheck = runs => [...runs]
  .sort(newestFirst)
  .find(item => item.conclusion !== 'skipped')

const latestStatus = (statuses, name) => statuses
  .filter(item => item.context === name)
  .sort(newestFirst)[0]

const successfulLatestEvidence = (check, status) => {
  if (!check) return status?.state === 'success'
  if (!status) return check.conclusion === 'success'
  const checkTime = evidenceTime(check)
  const statusTime = evidenceTime(status)
  if (checkTime === statusTime) return check.conclusion === 'success' && status.state === 'success'
  return checkTime > statusTime ? check.conclusion === 'success' : status.state === 'success'
}

export const hasExactApprovalMarker = (body, marker) => String(body || '')
  .split(/\r?\n/)
  .some(line => line.trim() === marker)

export const verifyRequiredChecks = async ({ api, releaseSha, required }) => {
  const statuses = await readGithubArrayPages(api, `/commits/${releaseSha}/statuses`)
  return Promise.all(required.map(async (name) => {
    const check = latestDecisiveCheck(await readCheckRuns(api, releaseSha, name))
    const status = latestStatus(statuses, name)
    return {
      name,
      successful: successfulLatestEvidence(check, status),
      checkConclusion: check?.conclusion || null,
      checkUrl: check?.details_url || null,
      statusState: status?.state || null,
      statusUrl: status?.target_url || null
    }
  }))
}
