import { defineConfig } from 'vitest/config';

// Firestore security rules tests (tests/rules). They need the Firestore
// emulator: run them with `npm run test:rules` (firebase emulators:exec).
export default defineConfig({
  test: {
    include: ['tests/rules/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
