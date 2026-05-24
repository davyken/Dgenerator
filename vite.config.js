import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
    },
    proxy: {
      '/adobe-api': {
        target: 'https://pdf-services.adobe.io',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/adobe-api/, ''),
      },
    },
  },
})
