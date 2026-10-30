import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En Docker, l'API est joignable via le nom du service (API_PROXY_TARGET=http://server:3001).
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  build: {
    // Bibliothèques dans des chunks séparés, mis en cache indépendamment du code de l'app.
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            { name: 'vendor', test: /node_modules/ },
          ],
        },
      },
    },
  },
  server: {
    port: 5173,
    // Host d'origine conservé (pas de changeOrigin) : l'API vérifie que l'Origin lui correspond.
    proxy: { '/api': { target: apiTarget } },
    // Le polling fiabilise le rechargement à chaud sur des volumes Docker montés.
    watch: process.env.VITE_USE_POLLING ? { usePolling: true, interval: 300 } : undefined,
  },
});
