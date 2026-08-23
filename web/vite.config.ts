import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// Piloto React+TS do Ateliê. Deploy no subpath /app/ do site vanilla
// (costureira.viziostudio.com.br/app/) — estratégia strangler.
export default defineConfig({
  base: '/app/',
  plugins: [react(), tailwind()],
})
