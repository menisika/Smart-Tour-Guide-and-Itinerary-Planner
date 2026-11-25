import react from '@vitejs/plugin-react';
import { defaultClientConditions, defineConfig } from 'vite';

/** Where `pnpm dev:console` finds the API: `docker compose up` publishes it here. */
const apiOrigin = process.env['PROMENADE_API_ORIGIN'] ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Workspace packages are bundled from their sources.
    conditions: ['@promenade/source', ...defaultClientConditions],
  },
  server: {
    port: 5173,
    strictPort: true,
    // The console is a client of the API like any other (ADR-0025). In
    // development its requests are proxied, so no cross-origin setup is needed.
    proxy: {
      '/api': apiOrigin,
      '/health': apiOrigin,
    },
  },
});
