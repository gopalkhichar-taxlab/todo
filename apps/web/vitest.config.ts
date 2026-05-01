import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only pick up unit/integration test files — exclude Playwright e2e specs
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['e2e/**', 'node_modules/**'],
    environment: 'node',
    // Don't fail the CI run when no unit test files exist yet
    passWithNoTests: true,
  },
});
