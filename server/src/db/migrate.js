import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const MIGRATIONS_DIR = path.resolve(import.meta.dirname, 'migrations');

/**
 * Applique, dans l'ordre alphabétique, les fichiers `migrations/*.sql` pas encore passés.
 * Un verrou MySQL évite que deux instances migrent en même temps.
 */
export async function migrate(pool, { log = console.log } = {}) {
  const conn = await pool.getConnection();
  try {
    await conn.query("SELECT GET_LOCK('binderbound_migrate', 30)");
    await conn.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
    const [rows] = await conn.query('SELECT name FROM schema_migrations');
    const applied = new Set(rows.map((r) => r.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

    for (const file of files.filter((f) => !applied.has(f))) {
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');
      // Une requête par instruction : pas besoin d'activer multipleStatements sur le pool.
      for (const statement of sql.split(/;\s*$/m).map((s) => s.trim())) {
        if (statement.replace(/^--.*$/gm, '').trim()) await conn.query(statement);
      }
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [file]);
      log(`[db] migration ${file} appliquée`);
    }
  } finally {
    await conn.query("SELECT RELEASE_LOCK('binderbound_migrate')").catch(() => {});
    conn.release();
  }
}
