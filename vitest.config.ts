import path from 'node:path';
import { defineConfig } from 'vitest/config';

const repoRoot = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(repoRoot, './apps/arcgym-web/src'),
      '@arcgym/drill-core': path.resolve(repoRoot, './packages/drill-core/src/index.ts'),
    },
  },
  test: {
    include: [
      'packages/drill-core/src/**/*.test.ts',
      'apps/arcgym-web/src/**/*.test.ts',
      'apps/arcgym-web/functions/**/*.test.ts',
    ],
  },
});
