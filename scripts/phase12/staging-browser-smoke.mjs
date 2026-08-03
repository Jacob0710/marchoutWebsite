import fs from 'node:fs'

const resultPath = 'test-results/results.json'
if (!fs.existsSync(resultPath)) throw new Error('Playwright JSON result is missing.')
const report = JSON.parse(fs.readFileSync(resultPath, 'utf8'))
if (report.stats.unexpected !== 0 || report.stats.flaky !== 0 || report.stats.skipped !== 0) {
  throw new Error(`Staging browser matrix is not clean: ${JSON.stringify(report.stats)}`)
}

const counts = new Map()
const visit = (suite) => {
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      if (test.status === 'expected') counts.set(test.projectName, (counts.get(test.projectName) || 0) + 1)
    }
  }
  for (const child of suite.suites || []) visit(child)
}
for (const suite of report.suites || []) visit(suite)

const minimums = {
  chromium: 27,
  firefox: 21,
  webkit: 21,
  'mobile-chromium': 21
}
for (const [project, minimum] of Object.entries(minimums)) {
  if ((counts.get(project) || 0) < minimum) throw new Error(`${project} ran fewer than ${minimum} passing journeys.`)
}

console.log(JSON.stringify({
  status: 'passed',
  expected: report.stats.expected,
  unexpected: 0,
  flaky: 0,
  skipped: 0,
  projects: Object.fromEntries(counts)
}, null, 2))
