import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://habit-sleep-tracker.local',
        changeOrigin: true,
      },
      '/sanctum': {
        target: 'http://habit-sleep-tracker.local',
        changeOrigin: true,
      },
    },
  },
})
