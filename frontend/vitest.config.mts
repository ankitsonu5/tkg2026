import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // Component tests opt into jsdom per file (`// @vitest-environment jsdom`).
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['tests/**/*.spec.{ts,tsx}'],
    testTimeout: 60_000,
  },
})
