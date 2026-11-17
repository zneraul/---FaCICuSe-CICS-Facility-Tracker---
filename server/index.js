import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './infrastructure/config.js';
import { buildApplicationContainer } from './infrastructure/container.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

export async function startServer() {
  const config = loadConfig();
  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '2mb' }));

  const { apiRouter } = buildApplicationContainer(config);
  app.use('/api', apiRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  const publicHtmlDir = path.join(rootDir, 'client/public');
  app.use('/assets', express.static(path.join(publicHtmlDir, 'assets')));
  app.get(['/', '/index.html'], (_req, res) => {
    res.sendFile(path.join(publicHtmlDir, 'index.html'));
  });
  app.get(['/about', '/about.html'], (_req, res) => {
    res.sendFile(path.join(publicHtmlDir, 'about.html'));
  });
  app.get(['/team', '/team.html'], (_req, res) => {
    res.sendFile(path.join(publicHtmlDir, 'team.html'));
  });

  if (!config.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      root: rootDir,
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(rootDir, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = app.listen(config.port, '0.0.0.0', () => {
    console.log(`FaCICuSe server listening on http://0.0.0.0:${config.port}`);
  });

  return { app, server };
}
