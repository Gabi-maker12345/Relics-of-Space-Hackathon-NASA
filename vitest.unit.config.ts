import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/schema.test.ts', 'tests/auth.test.ts'],
    exclude: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**'],
  },
  resolve: {
    alias: {
      '~': path.resolve(__dirname, '.'),
      '@': path.resolve(__dirname, '.'),
    },
  },
})
