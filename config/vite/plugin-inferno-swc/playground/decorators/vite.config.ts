import { defineConfig } from 'vite'
import inferno from '@vitejs/plugin-inferno-swc'

export default defineConfig({
  plugins: [inferno({ tsDecorators: true })],
})
