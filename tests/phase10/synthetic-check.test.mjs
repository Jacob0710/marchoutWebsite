import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { createServer } from 'node:http'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)

test('readiness 503 remains fail-closed and emits correlation-safe evidence', async () => {
  const server = createServer((request, response) => {
    response.setHeader('content-type', 'application/json')
    response.setHeader('cache-control', 'no-store, max-age=0')
    response.setHeader('x-request-id', 'request-12345678')
    response.setHeader('x-vercel-id', 'test1::test2::request-12345678')
    if (request.url === '/api/health') {
      response.end(JSON.stringify({ status: 'ok' }))
      return
    }
    response.statusCode = 503
    response.end(JSON.stringify({ status: 'unavailable', code: 'READINESS_DEPENDENCY_UNAVAILABLE' }))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert(address && typeof address !== 'string')

  try {
    await assert.rejects(
      execFileAsync(process.execPath, ['scripts/phase10/synthetic-check.mjs'], {
        cwd: process.cwd(),
        env: { ...process.env, PHASE10_SYNTHETIC_ORIGIN: `http://127.0.0.1:${address.port}` }
      }),
      (error) => {
        assert.notEqual(error.code, 0)
        assert.match(error.stderr, /"status": "failed"/)
        assert.match(error.stderr, /"path": "\/api\/health\/ready"/)
        assert.match(error.stderr, /"status": 503/)
        assert.match(error.stderr, /"requestId": "request-12345678"/)
        assert.match(error.stderr, /"vercelId": "test1::test2::request-12345678"/)
        assert.match(error.stderr, /"responseCode": "READINESS_DEPENDENCY_UNAVAILABLE"/)
        return true
      }
    )
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})

test('an unexpected deployment environment remains fail-closed', async () => {
  const server = createServer((request, response) => {
    response.setHeader('content-type', 'application/json')
    response.setHeader('cache-control', 'no-store, max-age=0')
    response.end(JSON.stringify({ status: 'ok', environment: 'production' }))
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert(address && typeof address !== 'string')

  try {
    await assert.rejects(
      execFileAsync(process.execPath, ['scripts/phase10/synthetic-check.mjs'], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          PHASE10_SYNTHETIC_ORIGIN: `http://127.0.0.1:${address.port}`,
          PHASE10_EXPECTED_ENVIRONMENT: 'staging'
        }
      }),
      (error) => {
        assert.notEqual(error.code, 0)
        assert.match(error.stderr, /Liveness environment mismatch; expected staging/)
        return true
      }
    )
  } finally {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})
