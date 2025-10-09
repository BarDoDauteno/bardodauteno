import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/bardodauteno", // Adicione esta linha
  server: {
    host: '0.0.0.0',  // 🔥 Permite acesso externo
    port: 5173,
    strictPort: true
  }

});