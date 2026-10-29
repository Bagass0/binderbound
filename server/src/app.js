import path from 'node:path';
import express from 'express';
import { setsRouter } from './routes/sets.js';
import { layoutRouter } from './routes/layout.js';
import { configRouter } from './routes/config.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

/**
 * Construit l'application Express (sans listen) pour pouvoir la tester avec supertest.
 * `staticDir` (prod) : sert le build du client et renvoie index.html pour les routes du SPA.
 */
export function createApp(repo, { staticDir } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/config', configRouter());
  app.use('/api/sets', setsRouter(repo));
  app.use('/api/layout', layoutRouter(repo));
  app.use('/api', notFound);

  if (staticDir) {
    app.use(express.static(staticDir, { index: false, maxAge: '1y', immutable: true }));
    app.get('/{*path}', (_req, res) =>
      res.sendFile(path.join(staticDir, 'index.html'), { maxAge: 0 }),
    );
  }

  app.use(errorHandler);
  return app;
}
