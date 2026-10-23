import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Browser calls /api/... on the Vite origin; Vite forwards to Flask.
// No CORS setup is needed. Change VITE_PROXY_TARGET in .env if Flask is elsewhere.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.VITE_PROXY_TARGET || 'http://localhost:5000';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': { target, changeOrigin: true },
        '/uploads': { target, changeOrigin: true },
      },
    },
  };
});
