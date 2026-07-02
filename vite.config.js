import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Force reload after installing packages
export default defineConfig({
  plugins: [react()],
})
