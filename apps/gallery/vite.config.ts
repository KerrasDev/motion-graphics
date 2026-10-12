import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getBasePath(): string {
  if (process.env.GITHUB_ACTIONS !== 'true') {
    return '/';
  }

  const configuredBase = process.env.VITE_BASE_PATH;
  if (configuredBase) {
    if (!configuredBase.startsWith('/') || !configuredBase.endsWith('/')) {
      throw new Error('VITE_BASE_PATH must start and end with /.');
    }
    return configuredBase;
  }

  const repository = process.env.GITHUB_REPOSITORY;
  const [owner, repositoryName, ...extraParts] = repository?.split('/') ?? [];
  if (!owner || !repositoryName || extraParts.length > 0) {
    throw new Error('GITHUB_REPOSITORY must be set to owner/repository when building in GitHub Actions.');
  }

  return repositoryName.toLowerCase() === `${owner}.github.io`.toLowerCase()
    ? '/'
    : `/${repositoryName}/`;
}

export default defineConfig({
  base: getBasePath(),
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:4000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@motion-graphics/core': path.resolve(__dirname, '../../packages/core/src/index.ts'),
      '@motion-graphics/effects': path.resolve(__dirname, '../../packages/effects/index.ts'),
    },
  },
});
