import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { setsRouter } from './routes/sets.js';
import { layoutRouter } from './routes/layout.js';
import { configRouter } from './routes/config.js';
import { authRouter } from './routes/auth.js';
import { bindersRouter } from './routes/binders.js';
import { collectionRouter } from './routes/collection.js';
import { loadSession, sameOrigin } from './middleware/session.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

/**
 * Construit l'application Express (sans listen) pour pouvoir la tester avec supertest.
 * `staticDir` (prod) : sert le build du client et renvoie index.html pour les routes du SPA.
 * `accounts` (voir services/accounts.js) : active les comptes, classeurs et collections.
 * Sans base de données, l'app reste utilisable sans compte.
 */
export function createApp(repo, { staticDir, accounts, trustProxy = false } = {}) {
  const app = express();
  app.disable('x-powered-by');
  // Derrière un reverse proxy, l'IP réelle (limitation des connexions) vient de X-Forwarded-For.
  app.set('trust proxy', trustProxy);
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/config', configRouter({ accounts }));
  app.use('/api/sets', setsRouter(repo));
  app.use('/api/layout', layoutRouter(repo));

  if (accounts) {
    app.use('/api', sameOrigin, cookieParser(), loadSession(accounts.sessions));
    app.use('/api/auth', authRouter(accounts));
    app.use('/api/binders', bindersRouter(repo, accounts));
    app.use('/api/collection', collectionRouter(repo, accounts));
  }
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
