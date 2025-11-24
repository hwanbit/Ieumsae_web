import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/udp_stream.mjpg': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/stream': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/hls': { target: 'http://127.0.0.1:5000', changeOrigin: true },
      '/interpret': {target: 'http://127.0.0.1:8008', changeOrigin: true},
    },
  },
});