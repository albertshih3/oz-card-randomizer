import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [react(), tsconfigPaths({ projects: ["./tsconfig.test.json"] })],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/test/**/*.test.{ts,tsx}"],
    typecheck: {
      tsconfig: "./tsconfig.test.json",
    },
    coverage: {
      provider: "v8",
      include: ["src/hooks/**", "src/utils/**"],
      exclude: ["src/test/**"],
    },
  },
});
