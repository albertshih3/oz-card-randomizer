import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const stub = (file: string) =>
  fileURLToPath(new URL(`./stubs/${file}`, import.meta.url));
const src = fileURLToPath(new URL("../src", import.meta.url));

/**
 * Serves the real app with real routing and animation, swapping only external
 * services for local stubs. envDir points here so .env.local is never loaded:
 * this configuration cannot reach production Firebase, Clerk, or analytics.
 */
export default defineConfig({
  root: fileURLToPath(new URL("..", import.meta.url)),
  envDir: fileURLToPath(new URL(".", import.meta.url)),
  cacheDir: "node_modules/.vite-e2e",
  define: {
    "import.meta.env.VITE_CLERK_PUBLISHABLE_KEY": JSON.stringify("pk_test_e2e"),
  },
  resolve: {
    alias: [
      { find: /^@clerk\/react(\/legacy)?$/, replacement: stub("clerk.tsx") },
      { find: "firebase/app", replacement: stub("firebase-app.ts") },
      { find: "firebase/auth", replacement: stub("firebase-auth.ts") },
      {
        find: "firebase/firestore",
        replacement: stub("firebase-firestore.ts"),
      },
      { find: "@vercel/analytics/react", replacement: stub("analytics.tsx") },
      { find: /^@\//, replacement: `${src}/` },
    ],
  },
  plugins: [react()],
  server: { port: 5199, strictPort: true },
});
