#!/usr/bin/env node
/**
 * Synchronise les sets Riftbound depuis Riftcodex vers data/sets/<id>.json.
 *
 *   npm run sync-sets                 # tous les sets
 *   npm run sync-sets -- OGN SFD      # seulement ces codes
 *   npm run sync-sets -- --dry-run    # valide sans écrire
 */
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { fetchSets, SOURCE } from '../src/import/riftcodex.js';
import { setSchema } from '../src/schemas/set.schema.js';
import { coverColor } from '../src/import/coverColor.js';
import { applySupplement, loadSupplement } from '../src/import/supplements.js';
import { coverImage, SETS_DIR } from '../src/services/setRepository.js';
import { countCards } from '../src/layout/countCards.js';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'dry-run': { type: 'boolean', default: false } },
});
const codes = positionals.map((c) => c.toUpperCase());

console.log(
  `↻ Téléchargement depuis ${SOURCE.name}${codes.length ? ` (${codes.join(', ')})` : ''}…`,
);
const sets = await fetchSets({ codes });
if (!sets.length) {
  console.error('✖ Aucun set trouvé.');
  process.exit(1);
}

let failed = 0;
for (const fetched of sets) {
  // Cartes absentes de la source, ajoutées à la main (data/supplements/<id>.json).
  const { set: raw, added } = applySupplement(fetched, await loadSupplement(fetched.id));
  if (added.length)
    console.log(`  + ${fetched.code} : ${added.map((c) => c.id).join(', ')} (supplément)`);
  const result = setSchema.safeParse(raw);
  if (!result.success) {
    failed += 1;
    console.error(`✖ ${raw.code} invalide :\n${z.prettifyError(result.error)}`);
    continue;
  }
  const set = result.data;
  // Teinte du classeur : facultative, un échec du CDN ne bloque pas la synchronisation.
  set.color = await coverColor(coverImage(set.cards)).catch((err) => {
    console.warn(`⚠ ${set.code} : couleur non calculée (${err.message})`);
    return null;
  });
  const { base, variants } = countCards(set.cards);
  const standalone = set.cards.filter((c) => c.variant !== 'base' && !c.baseCardId).length;
  const note = standalone ? ` (${standalone} sans carte de base dans le set)` : '';
  console.log(
    `✔ ${set.code.padEnd(4)} ${set.name.en} : ${base} cartes + ${variants} variantes${note}`,
  );
  if (!values['dry-run']) {
    await writeFile(path.join(SETS_DIR, `${set.id}.json`), JSON.stringify(set, null, 2) + '\n');
  }
}

if (values['dry-run']) console.log('(dry-run : aucun fichier écrit)');
process.exit(failed ? 1 : 0);
