import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// BASE_PATH is set by CI: "/bx/" for the main site, "/bx/pr-preview/pr-<n>/" for PR previews.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 2000 },
});
