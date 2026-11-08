#!/usr/bin/env node
/**
 * Calcule les empreintes visuelles (scan de carte) des sets déjà présents dans data/sets.
 * `npm run sync-sets` le fait aussi ; ce script évite de retélécharger les sets.
 *
 *   npm run fingerprint-sets              # tous les sets
 *   npm run fingerprint-sets -- ogn sfd   # seulement ces sets
 */
import { parseArgs } from 'node:util';
import { loadSets } from '../src/services/setRepository.js';
import { writeFingerprints } from '../src/services/fingerprints.js';

const { positionals } = parseArgs({ allowPositionals: true });
const ids = positionals.map((id) => id.toLowerCase());

const sets = [...(await loadSets()).values()].filter((s) => !ids.length || ids.includes(s.id));
for (const set of sets) {
  const count = await writeFingerprints(set);
  console.log(`✔ ${set.code.padEnd(4)} ${count}/${set.cards.length} empreintes`);
}
