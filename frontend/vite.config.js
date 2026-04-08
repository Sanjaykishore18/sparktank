import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [
      react(),
      // Use SSL in dev mode for microphone access over network
      ...(command === 'serve' ? [basicSsl()] : [])
    ],
    build: {
      outDir: 'dist',
      sourcemap: false
    },
    server: {
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:5000',
          changeOrigin: true,
          secure: false
        },
        '/socket.io': {
          target: 'http://localhost:5000',
          ws: true,
          secure: false
        }
      }
    }
  }
})
