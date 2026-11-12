import path from 'node:path';
import express from 'express';
import cookieParser from 'cookie-parser';
import { setsRouter } from './routes/sets.js';
import { layoutRouter } from './routes/layout.js';
import { configRouter } from './routes/config.js';
import { authRouter } from './routes/auth.js';
import { bindersRouter } from './routes/binders.js';
import { collectionRouter } from './routes/collection.js';
import { friendsRouter } from './routes/friends.js';
import { tradesRouter } from './routes/trades.js';
import { loadSession, sameOrigin } from './middleware/session.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

/**
 * Construit l'application Express (sans listen) pour pouvoir la tester avec supertest.
 * `staticDir` (prod) : sert le build du client et renvoie index.html pour les routes du SPA.
 * `accounts` (voir services/accounts.js) : active les comptes, classeurs et collections.
 * `prices` / `fingerprints` (services/prices.js, services/fingerprints.js) : prix et scan.
 * Sans base de données, l'app reste utilisable sans compte.
 */
export function createApp(
  repo,
  { staticDir, accounts, prices, fingerprints, trustProxy = false } = {},
) {
  const app = express();
  app.disable('x-powered-by');
  // Derrière un reverse proxy, l'IP réelle (limitation des connexions) vient de X-Forwarded-For.
  app.set('trust proxy', trustProxy);
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api/config', configRouter({ accounts }));
  app.use('/api/sets', setsRouter(repo, { prices, fingerprints }));
  app.use('/api/layout', layoutRouter(repo));

  if (accounts) {
    app.use('/api', sameOrigin, cookieParser(), loadSession(accounts.sessions));
    app.use('/api/auth', authRouter(accounts));
    app.use('/api/binders', bindersRouter(repo, accounts));
    app.use('/api/collection', collectionRouter(repo, accounts));
    app.use('/api/friends', friendsRouter(repo, accounts));
    app.use('/api/trades', tradesRouter(repo, accounts));
  }
  app.use('/api', notFound);

  if (staticDir) {
    // Seuls les fichiers de Vite (assets/, nom haché) sont immuables ; robots.txt, sitemap.xml,
    // favicon… peuvent changer sans changer de nom.
    const assetsDir = path.join(staticDir, 'assets') + path.sep;
    app.use(
      express.static(staticDir, {
        index: false,
        maxAge: '1h',
        setHeaders: (res, file) => {
          if (file.startsWith(assetsDir)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      }),
    );
    // Les routes du SPA n'ont pas d'extension : un fichier absent (/favicon.png…) répond 404
    // plutôt que la page HTML, que les robots prendraient pour une image cassée.
    app.get('/{*path}', (req, res, next) =>
      path.extname(req.path)
        ? next()
        : res.sendFile(path.join(staticDir, 'index.html'), { maxAge: 0 }),
    );
  }

  app.use(errorHandler);
  return app;
}
