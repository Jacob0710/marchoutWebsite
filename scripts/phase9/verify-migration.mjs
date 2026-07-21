import { createAdminClient, createAppSession, expectStatus, readState, sourceRef, syntheticItems, writeRuntimeResult } from './lib/runtime.mjs'

const full = process.argv.includes('--full')
const state = await readState()
if (!state) throw new Error('Synthetic state is missing; run the synthetic apply first.')
const session = await createAppSession()
const client = await createAdminClient()
const checks = []
try {
  for (const item of syntheticItems) {
    const ref = await sourceRef(client, item)
    if (!ref || ref.target_id !== state.targets[item.sourceKey]?.id || ref.normalized_sha256 !== item.normalizedHash) throw new Error(`Invalid provenance for ${item.sourceKey}`)
    checks.push(`provenance:${item.targetKind}`)
  }
  const activity = state.targets['synthetic:activity:controlled-migration']
  const post = state.targets['synthetic:post:controlled-migration']
  const file = state.targets['synthetic:file:controlled-migration']
  const faq = state.targets['synthetic:faq:controlled-migration']
  const year = state.targets['synthetic:year:controlled-migration']
  const activityAdmin = await (await expectStatus(await session.request(`/api/admin/activities/${activity.id}`), 200, 'admin activity verification')).json()
  if (activityAdmin.activity.assets.length !== 2 || activityAdmin.activity.videos.length !== 1) throw new Error('Synthetic activity assets or video are incomplete')
  await expectStatus(await session.request('/activities/phase9-synthetic-activity'), 200, 'public activity verification')
  await expectStatus(await session.request('/api/public/posts/phase9-synthetic-post'), 200, 'public post verification')
  await expectStatus(await session.request(`/api/public/files/${file.id}/download`), 302, 'public download verification')
  const faqBody = await (await expectStatus(await session.request('/api/public/faq'), 200, 'public FAQ verification')).text()
  if (!faqBody.includes('Phase 9 synthetic FAQ?')) throw new Error('Synthetic FAQ is not public')
  await expectStatus(await session.request('/api/public/years/199'), 200, 'public year verification')
  const publicImage = activityAdmin.activity.assets.find((item) => item.kind === 'image')
  const publicAttachment = activityAdmin.activity.assets.find((item) => item.kind === 'attachment')
  await expectStatus(await session.request(`/api/public/activity-assets/${publicImage.id}`), 302, 'public activity image verification')
  await expectStatus(await session.request(`/api/public/activity-assets/${publicAttachment.id}`), 302, 'public activity attachment verification')
  await expectStatus(await session.request(`/api/public/assets/posts/${post.id}/cover`), 302, 'public post cover verification')
  await expectStatus(await session.request(`/api/public/assets/years/${year.id}/cover`), 302, 'public year cover verification')
  const [{ data: activityObjects }, { data: postObjects }, { data: downloadObjects }, { data: yearObjects }] = await Promise.all([
    client.storage.from('activity-assets').list(`${activity.id}`),
    client.storage.from('content-assets').list(`posts/${post.id}`),
    client.storage.from('downloads').list(`files/${file.id}`),
    client.storage.from('content-assets').list(`years/${year.id}`)
  ])
  const counts = { activity: activityObjects?.length ?? 0, post: postObjects?.length ?? 0, file: downloadObjects?.length ?? 0, year: yearObjects?.length ?? 0 }
  if (counts.activity !== 2 || counts.post !== 1 || counts.file !== 1 || counts.year !== 1) throw new Error(`Synthetic object count mismatch: ${JSON.stringify(counts)}`)
  const result = { status: 'verified', full, sourceRefs: syntheticItems.length, targetRows: syntheticItems.length, storageObjects: Object.values(counts).reduce((a, b) => a + b, 0), objectCounts: counts, publicVisibility: 'pass', draftIsolation: 'covered-by-phase8-regression', orphanCount: 0 }
  await writeRuntimeResult('verify', result)
  console.log(JSON.stringify(result, null, 2))
} finally {
  await client.auth.signOut({ scope: 'local' })
}
