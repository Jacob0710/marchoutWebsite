import { spawnSync } from 'node:child_process'

const envFiles = ['--env-file-if-exists=.env', '--env-file-if-exists=.env.phase6.local']
const steps = [
  ['migrate-content.mjs', '--mode=dry-run', '--synthetic'],
  ['migrate-content.mjs', '--mode=apply', '--synthetic'],
  ['verify-migration.mjs', '--full'],
  ['migrate-content.mjs', '--mode=resume', '--synthetic'],
  ['migrate-content.mjs', '--mode=apply', '--synthetic'],
  ['verify-migration.mjs', '--full'],
  ['rollback-test.mjs']
]
for (const [script, ...args] of steps) {
  const result = spawnSync(process.execPath, [...envFiles, new URL(script, import.meta.url).pathname.slice(1), ...args], { stdio: 'inherit', shell: false })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
console.log('PASS Phase 9 synthetic dry-run/apply/verify/resume/second-apply/rollback-test complete.')
