import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic',
    }),
    tailwindcss(),
  ],
  esbuild: {
    jsx: 'automatic',
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['.trycloudflare.com'],
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    env: {
      VITE_API_BASE_URL: 'http://test-api.example.com',
      VITE_LIVEKIT_URL: 'wss://test.livekit.cloud',
      VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_example',
    },
  },
})
