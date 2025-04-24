import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',  // Allow external access
    allowedHosts: ['*', '*.ngrok-free.app', 'wise-safely-platypus.ngrok-free.app'],  // Explicitly add ngrok domain
    cors: {
      origin: '*',  // Allow all origins
      methods: '*',  // Allow all HTTP methods
      allowedHeaders: '*'  // Allow all headers
    },
  },
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
