import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import waitlist from './api/waitlist.js';

// Serves the Vercel function at /api/waitlist during `vite dev` and `vite preview`,
// so the forms can be submitted end to end locally.
const apiDev = () => ({
  name: 'dova-api-dev',
  configureServer(server) { server.middlewares.use('/api/waitlist', (req, res) => waitlist(req, res)); },
  configurePreviewServer(server) { server.middlewares.use('/api/waitlist', (req, res) => waitlist(req, res)); },
});

export default defineConfig({ plugins: [react(), apiDev()] });
