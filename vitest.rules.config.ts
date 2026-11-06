import { defineConfig } from "vitest/config";

// Separate from the unit suite: these need the Firestore emulator (Java).
export default defineConfig({
  test: {
    environment: "node",
    include: ["rules-tests/**/*.test.ts"],
    fileParallelism: false,
  },
});
