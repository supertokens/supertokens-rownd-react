import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const backendPort = Number(process.env.EXAMPLE_BACKEND_PORT || 3137);

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/example-bootstrap': `http://localhost:${backendPort}`,
    },
  },
});
