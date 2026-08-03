import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '~': root,
      '@': root
    }
  },
  test: {
    environment: 'node',
    include: ['tests/application/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'server/utils/activityApi.ts',
        'server/utils/activityValidation.ts',
        'server/utils/apiErrors.ts',
        'utils/supabaseMappers.ts'
      ],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage-application',
      thresholds: {
        statements: 75,
        branches: 65,
        functions: 75,
        lines: 75
      }
    }
  }
})
