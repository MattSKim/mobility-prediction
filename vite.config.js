import { defineConfig } from 'vite'

export default defineConfig({
  root: './', // Specify the root directory
  publicDir: './public', // If you have any public assets
  server: {
    open: true, // Open browser on start
  }
}) 