import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { VitePluginRadar } from 'vite-plugin-radar'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(),
    VitePluginRadar({
      // Google Analytics tag injection
      analytics: {
        id: 'G-Q4K84LKR3M',
      },
    }),
  ],
})
