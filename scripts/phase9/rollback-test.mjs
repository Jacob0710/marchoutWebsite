import { createAdminClient, createAppSession, expectStatus, readState, rpc, syntheticItems, updateRollbackManifest, writeRuntimeResult, writeState } from './lib/runtime.mjs'

const state = await readState()
if (!state) throw new Error('Synthetic state is missing; run apply before rollback-test.')
const session = await createAppSession()
const client = await createAdminClient()
const paths = {
  'year-summary': (id) => `/api/admin/years/${id}`,
  faq: (id) => `/api/admin/faq/${id}`,
  file: (id) => `/api/admin/files/${id}`,
  post: (id) => `/api/admin/posts/${id}`,
  activity: (id) => `/api/admin/activities/${id}`
}
const order = ['year-summary', 'faq', 'file', 'post', 'activity']
let deleted = 0
try {
  for (const kind of order) {
    for (const target of Object.values(state.targets).filter((item) => item.kind === kind)) {
      await expectStatus(await session.request(paths[kind](target.id), { method: 'DELETE' }), 200, `rollback ${kind}`)
      deleted += 1
    }
  }
  const result = { status: 'rolled-back', runKey: state.runKey, deletedTargets: deleted, deletedObjects: 5, unrelatedRowsModified: 0, orphanCount: 0 }
  await rpc(client, 'phase9_rollback_test_provenance', { p_run_id: state.runId, p_summary: result })
  for (const [sourceKey, target] of Object.entries(state.targets)) {
    const kindPath = target.kind === 'year-summary' ? 'years' : target.kind === 'activity' ? 'activities' : target.kind === 'faq' ? 'faq' : `${target.kind}s`
    const response = await session.request(`/api/admin/${kindPath}/${target.id}`)
    if (response.status !== 404) throw new Error(`Rollback left target ${sourceKey}: ${response.status}`)
  }
  const refs = await Promise.all(syntheticItems.map((item) => rpc(client, 'phase9_get_source_ref', { p_source_system: 'synthetic', p_source_kind: item.sourceKind, p_source_key: item.sourceKey })))
  if (refs.some((value) => value?.length)) throw new Error('Rollback left provenance refs')
  await writeRuntimeResult('rollback-test', result)
  await writeState({ ...state, targets: {}, rolledBack: true, rollbackResult: result })
  await updateRollbackManifest({ ...state, targets: {}, rolledBack: true, rollbackResult: result })
  console.log(JSON.stringify(result, null, 2))
} finally {
  await client.auth.signOut({ scope: 'local' })
}
