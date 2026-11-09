import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const app = fileURLToPath(new URL('./app', import.meta.url))
const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts', 'server/**/*.test.ts'],
    exclude: ['node_modules', '.nuxt', '.output'],
    passWithNoTests: true,
    restoreMocks: true,
  },
  resolve: {
    alias: {
      '~~': root,
      '@@': root,
      '~': app,
      '@': app,
    },
  },
})
