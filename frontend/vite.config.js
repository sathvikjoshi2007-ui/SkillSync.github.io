import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/SkillSync.github.io/',
  build: {
    outDir: '../',
    emptyOutDir: false,
  },
})
