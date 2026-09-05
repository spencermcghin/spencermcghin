import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      // The frontend imports the ruleset schema and engine from ../shared,
      // which sits outside Vite's project root.
      allow: ['..'],
    },
    // Lets the client call /api in development exactly as it does in a
    // single-service deploy, so neither needs an environment variable.
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
