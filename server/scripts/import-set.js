#!/usr/bin/env node
/**
 * Valide un fichier JSON de set et, avec --write, le copie dans data/sets/<id>.json.
 *
 *   npm run import-set -- ./mon-set.json           # validation seule
 *   npm run import-set -- ./mon-set.json --write   # validation + copie
 */
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { setSchema } from '../src/schemas/set.schema.js';
import { SETS_DIR } from '../src/services/setRepository.js';
import { countCards } from '../src/layout/countCards.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    write: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
});

const [file] = positionals;
if (!file) {
  console.error('Usage : npm run import-set -- <fichier.json> [--write] [--force]');
  process.exit(1);
}

let raw;
try {
  raw = JSON.parse(await readFile(path.resolve(process.cwd(), file), 'utf8'));
} catch (err) {
  console.error(`✖ Impossible de lire ${file} : ${err.message}`);
  process.exit(1);
}

const result = setSchema.safeParse(raw);
if (!result.success) {
  console.error(`✖ Set invalide (${result.error.issues.length} erreur(s)) :\n`);
  console.error(z.prettifyError(result.error));
  process.exit(1);
}

const set = result.data;
const { base, variants } = countCards(set.cards);
console.log(`✔ ${set.code} « ${set.name.fr} » valide : ${base} cartes + ${variants} variantes`);

if (values.write) {
  const target = path.join(SETS_DIR, `${set.id}.json`);
  const exists = await access(target).then(
    () => true,
    () => false,
  );
  if (exists && !values.force) {
    console.error(`✖ ${target} existe déjà (ajoute --force pour écraser)`);
    process.exit(1);
  }
  await writeFile(target, JSON.stringify(set, null, 2) + '\n');
  console.log(`→ écrit dans ${path.relative(process.cwd(), target)}`);
}
