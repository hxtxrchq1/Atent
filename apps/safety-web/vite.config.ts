import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const sharedTokens = fileURLToPath(new URL('../../packages/shared/src/tokens/index.ts', import.meta.url));

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@atent/shared/tokens': sharedTokens } },
  server: {
    port: 3001,
  },
});
