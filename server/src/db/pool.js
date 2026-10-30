import mysql from 'mysql2/promise';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Pool MySQL à partir d'une URL `mysql://user:pass@host:port/db`. Toutes les dates sont en UTC.
 * Attend que la base réponde (utile quand MySQL démarre en même temps que l'API).
 */
export async function connect(url, { retries = 15, delay = 2000 } = {}) {
  const pool = mysql.createPool({ uri: url, timezone: 'Z', connectionLimit: 10 });
  pool.pool.on('connection', (conn) => conn.query("SET time_zone = '+00:00'"));

  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query('SELECT 1');
      return pool;
    } catch (err) {
      if (attempt >= retries) {
        await pool.end();
        throw err;
      }
      console.log(`[db] MySQL indisponible (${err.code ?? err.message}), nouvel essai…`);
      await sleep(delay);
    }
  }
}
