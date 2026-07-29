import { createConfigForNuxt } from '@nuxt/eslint-config'

export default createConfigForNuxt()
  .append({
    name: 'marchout/ignores',
    ignores: [
      '.nuxt/**',
      '.output/**',
      '.phase9-cache/**',
      '.phase10-cache/**',
      '.phase10-private/**',
      '.phase11-cache/**',
      'coverage/**',
      'migration/phase9/private/**',
      'migration/phase9/tmp/**',
      'migration/phase10/private/**',
      'migration/phase10/tmp/**'
    ]
  })
  .append({
    name: 'marchout/vue-conventions',
    files: ['**/*.vue'],
    rules: {
      'vue/first-attribute-linebreak': 'off',
      'vue/html-self-closing': 'off',
      'vue/multi-word-component-names': 'off',
      'vue/no-multiple-template-root': 'off',
      'vue/require-default-prop': 'off'
    }
  })
  .append({
    name: 'marchout/intentional-sanitizers',
    rules: {
      'no-control-regex': 'off'
    }
  })
  .append({
    name: 'marchout/legacy-verified-scripts',
    files: [
      'scripts/phase5-*.mjs',
      'scripts/phase6-*.mjs',
      'scripts/phase7-*.mjs',
      'scripts/phase8-*.mjs',
      'scripts/phase9/**/*.mjs',
      'scripts/phase10/**/*.mjs'
    ],
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-unused-vars': 'off',
      'no-useless-assignment': 'off'
    }
  })
