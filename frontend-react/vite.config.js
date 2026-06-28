import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server on 5173; build outputs to /dist (served by nginx in Docker).
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 5173 }
})
