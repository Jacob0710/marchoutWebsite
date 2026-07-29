import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'

const root = fileURLToPath(new URL('.', import.meta.url))
const alias = {
  '~': root,
  '@': root
}

export default defineConfig({
  resolve: { alias },
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.spec.ts']
        }
      },
      {
        plugins: [vue()],
        resolve: { alias },
        test: {
          name: 'components',
          environment: 'happy-dom',
          include: ['tests/components/**/*.spec.ts']
        }
      }
    ],
    coverage: {
      provider: 'v8',
      include: [
        'shared/activityRules.ts',
        'shared/contentRules.ts',
        'shared/operationalRules.ts',
        'shared/schemas/adminAccess.ts',
        'server/utils/redactedDerivative.ts',
        'utils/csv.ts',
        'utils/slug.ts'
      ],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage',
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90
      }
    }
  }
})
