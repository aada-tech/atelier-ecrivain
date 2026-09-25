import { defineConfig } from 'vitest/config';

// Tests des règles Firestore : exécutés dans l'émulateur (npm run test:rules).
export default defineConfig({
  test: { include: ['tests/rules/**/*.test.ts'], environment: 'node', testTimeout: 20_000, fileParallelism: false },
});
