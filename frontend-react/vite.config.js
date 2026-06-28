import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server on 3123; build outputs to /dist (served by nginx in Docker).
export default defineConfig({
  plugins: [react()],
  server: { host: true, port: 3123 }
})
