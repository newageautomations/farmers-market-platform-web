import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    fileParallelism: false,
    // Threads inherit this Windows sandbox's filesystem mapping without child-process Temp drift.
    pool: 'threads',
    maxWorkers: 1,
    restoreMocks: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    reporters:
      process.env.FRONTEND_NO_EVIDENCE === 'true'
        ? ['default']
        : ['default', 'json'],
    ...(process.env.FRONTEND_NO_EVIDENCE === 'true'
      ? {}
      : {
          outputFile: `${process.env.FRONTEND_EVIDENCE_DIR ?? 'docs/evidence/phase13c5'}/unit-results.json`,
        }),
  },
});
