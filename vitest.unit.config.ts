import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'tests/schema.test.ts',
      'tests/auth.test.ts',
      'tests/upload.test.ts',
      'tests/relic-contract.test.ts',
      'tests/media.test.ts',
      'tests/i18n.test.ts',
      'tests/seed.test.ts',
      'tests/quiz.test.ts',
      'tests/nasa.test.ts',
      'tests/relic-filters.test.ts',
      'tests/narration-timing.test.ts',
      'tests/relics-ui.test.ts',
      'tests/media-paths.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, '.'),
      '@': path.resolve(__dirname, '.'),
      '#shared': path.resolve(__dirname, 'shared'),
    },
  },
})
