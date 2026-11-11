import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Test against @dds/shared's source, so tests never depend on a stale or missing build.
  resolve: { alias: { '@dds/shared': fileURLToPath(new URL('../shared/src/index.ts', import.meta.url)) } },
  test: { include: ['test/**/*.test.ts'] },
});
