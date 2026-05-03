import { defineConfig } from "vite";
import type { IncomingMessage, ServerResponse } from "http";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { VitePluginRadar } from "vite-plugin-radar";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
    strictPort: true,
  },
  plugins: [
    {
      name: "api-dev-interceptor",
      configureServer(server) {
        server.middlewares.use(
          (req: IncomingMessage, res: ServerResponse, next: () => void) => {
            if (req.url?.startsWith("/api/")) {
              res.statusCode = 503;
              res.setHeader("Content-Type", "application/json");
              res.end(
                JSON.stringify({
                  error:
                    "API unavailable in Vite-only mode. Run npm run dev:full for full-stack development.",
                }),
              );
              return;
            }
            next();
          },
        );
      },
    },
    react(),
    tsconfigPaths(),
    VitePluginRadar({
      // Google Analytics tag injection
      analytics: {
        id: "G-Q4K84LKR3M",
      },
    }),
  ],
});
