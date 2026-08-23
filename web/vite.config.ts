import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'

// App principal do Ateliê na RAIZ (costureira.viziostudio.com.br).
// O vanilla ficou como fallback em /legacy/. (Antes: base '/app/' — strangler.)
export default defineConfig({
  base: '/',
  plugins: [react(), tailwind()],
})
