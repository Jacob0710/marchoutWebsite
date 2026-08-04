import assert from 'node:assert/strict'
import test from 'node:test'
import { parseCsv, readCsv, sha256, toCsv } from '../../scripts/phase14/lib.mjs'
import { ownerReviewColumns } from '../../scripts/phase14/owner-review.mjs'
import { ownerReviewStatus } from '../../scripts/phase14/gate3-owner-status.mjs'
import {
  adminUatColumns, adminUatHumanColumns, adminUatStatus, generateAdminUatRows, validateAdminUatRows
} from '../../scripts/phase14/gate3-admin-uat.mjs'

test('405-row owner status remains unreviewed and separates 378 assigned from 27 accepted-skip', async () => {
  const rows = await readCsv('outputs/phase-14-owner-review-working.csv')
  const status = ownerReviewStatus(rows, ownerReviewColumns)
  assert.equal(status.total_rows, 405)
  assert.equal(status.assigned_relationship_rows, 378)
  assert.equal(status.accepted_skip_source_rows, 27)
  assert.equal(status.unreviewed_rows, 405)
  assert.equal(status.human_touched_rows, 0)
  assert.equal(status.approved_rows, 0)
  assert.equal(status.owner_signatures_created_by_automation, 0)
  assert.equal(status.pending_row_ids.length, 405)
})

test('23 UAT cases are templates only and automated checks do not create results', () => {
  const generated = generateAdminUatRows()
  assert.deepEqual(generated.conflicts, [])
  assert.equal(generated.rows.length, 23)
  assert.ok(generated.rows.every(row => adminUatHumanColumns.every(column => row[column] === '')))
  assert.deepEqual(validateAdminUatRows(generated.rows), [])
  assert.deepEqual(adminUatStatus(generated.rows), {
    total_cases: 23, unexecuted_cases: 23, pass_cases: 0, fail_cases: 0, blocked_cases: 0,
    not_applicable_cases: 0, invalid_rows: 0, human_executed_cases: 0,
    audit_sha256: sha256(toCsv(adminUatColumns, generated.rows)), adminUatExecutionsClaimedByAutomation: 0
  })
})

test('UAT validation accepts complete non-production evidence and rejects production', () => {
  const rows = generateAdminUatRows().rows
  Object.assign(rows[0], {
    environment: 'staging', releaseSha: 'a'.repeat(40), tester: '管理員測試者',
    startedAt: '2026-08-04T01:00:00Z', completedAt: '2026-08-04T01:03:00Z',
    inputFixtureKey: 'fixture-管理員登入', actualResult: '登入與登出符合預期', humanResult: 'pass', evidenceHash: 'b'.repeat(64)
  })
  assert.deepEqual(validateAdminUatRows(rows), [])
  const rerun = generateAdminUatRows(rows)
  assert.equal(rerun.rows[0].tester, '管理員測試者')
  rerun.rows[0].environment = 'production'
  assert.match(validateAdminUatRows(rerun.rows).join('\n'), /environment must be non-production|production mutation UAT is prohibited/)
})

test('UAT CSV preserves Traditional Chinese, commas, and line breaks', () => {
  const row = generateAdminUatRows().rows[0]
  row.notes = '繁體中文，人工備註\n第二行'
  const parsed = parseCsv(toCsv(adminUatColumns, [row]))
  assert.equal(parsed[0].notes, row.notes)
})
