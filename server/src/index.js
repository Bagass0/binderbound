import { createApp } from './app.js';
import { connect } from './db/pool.js';
import { migrate } from './db/migrate.js';
import { createAccounts } from './services/accounts.js';
import { createSetRepository, loadSets } from './services/setRepository.js';
import { createPriceService } from './services/prices.js';
import { createFingerprintStore } from './services/fingerprints.js';

const env = process.env;
const PORT = Number(env.PORT) || 3001;
const STATIC_DIR = env.STATIC_DIR || undefined;

const sets = await loadSets();

// Les comptes nécessitent MySQL : sans DATABASE_URL, l'app fonctionne en mode invité.
let accounts;
if (env.DATABASE_URL) {
  const db = await connect(env.DATABASE_URL);
  await migrate(db);
  accounts = createAccounts(db, {
    googleClientId: env.GOOGLE_CLIENT_ID || null,
    cookieSecure: (env.COOKIE_SECURE ?? String(env.NODE_ENV === 'production')) === 'true',
  });
  // Ménage quotidien des sessions expirées.
  setInterval(() => accounts.sessions.purgeExpired().catch(console.error), 24 * 3600e3).unref();
} else {
  console.warn('[db] DATABASE_URL absent : comptes désactivés (mode invité uniquement).');
}

const app = createApp(createSetRepository(sets), {
  staticDir: STATIC_DIR,
  accounts,
  // Card Nexus (prix Cardmarket en euros) si une clé d'API est fournie ; TCGplayer sinon.
  prices: createPriceService({
    cardNexus: env.CARDNEXUS_API_KEY
      ? { apiKey: env.CARDNEXUS_API_KEY, game: env.CARDNEXUS_GAME || 'riftbound' }
      : null,
  }),
  fingerprints: createFingerprintStore(),
  trustProxy: Number(env.TRUST_PROXY) || false, // nombre de reverse proxies devant l'app
});

app.listen(PORT, () => {
  const mode = accounts ? `comptes activés${accounts.verifyGoogle ? ' + Google' : ''}` : 'invité';
  console.log(`Binderbound API → http://localhost:${PORT} (${sets.size} set(s), ${mode})`);
});
