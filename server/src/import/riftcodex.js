/**
 * Source de données Riftcodex (https://riftcodex.com) : API communautaire, sans clé.
 * Les illustrations sont servies par le CDN de Riot ; on ne stocke que leurs URL.
 *
 * Pour brancher une autre source (ex. l'API officielle Riot), il suffit d'exposer le même
 * contrat : `fetchSets()` → [{ meta, cards }] où chaque set est déjà au format Binderbound.
 */

export const SOURCE = { name: 'Riftcodex', url: 'https://riftcodex.com' };
const API = 'https://api.riftcodex.com';
const PAGE_SIZE = 100;

/** Codes des sets de promos (affichés à part sur l'accueil). */
const PROMO_SETS = new Set(['PR', 'OPP', 'JDG']);

const VARIANT_SUFFIX = /\s*\((alternate art|overnumbered|signature)\)\s*$/i;

/** Clé de rapprochement d'un nom : « Jinx, Demolitionist (Overnumbered) » ≈ « Jinx - Demolitionist ». */
const nameKey = (name) =>
  name
    .replace(VARIANT_SUFFIX, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Libellé final entre parenthèses qui n'est pas une variante, ex. « (Metal) ». */
const printingLabel = (name) =>
  VARIANT_SUFFIX.test(name) ? null : (name.match(/\(([^)]+)\)\s*$/)?.[1] ?? null);

/**
 * Nettoie les doublons de la source. Un même identifiant désigne la même carte : on garde
 * l'enregistrement le plus récent (les anciens ont parfois un nom tronqué ou de mauvais
 * drapeaux). Exception : un libellé d'impression (« … (Metal) ») marque une carte distincte,
 * dont l'identifiant reçoit ce libellé en suffixe.
 */
export function dedupe(rawCards) {
  const latest = new Map();
  for (const card of rawCards) {
    const label = printingLabel(card.name);
    const id = card.riftbound_id.toUpperCase() + (label ? `-${slug(label).toUpperCase()}` : '');
    const kept = latest.get(id);
    if (!kept || card.metadata.updated_on > kept.metadata.updated_on)
      latest.set(id, { ...card, id });
  }
  return [...latest.values()];
}

/** Identifiant officiel « set-numéro[lettre][*]-total », ex. ogn-027a-298, unl-229*-219. */
const OFFICIAL_ID = /^[a-z]+-(\d+)([a-z]?)(\*?)-(\d+)$/i;

/**
 * Variante d'une carte. Dans une extension, elle se déduit de l'identifiant officiel, plus fiable
 * que les drapeaux de la source (souvent manquants sur les sets récents) :
 * `*` = signature, lettre = alt-art, numéro > total du set = overnumbered,
 * identifiant hors numérotation (runes R01, cartes SP1, jetons) = hors série.
 * Les sets de promos suivent la numérotation d'autres sets : on garde alors les drapeaux.
 */
export function variantOf(card, isPromoSet) {
  if (isPromoSet) {
    const { metadata } = card;
    if (metadata.signature) return 'signature';
    if (metadata.overnumbered) return 'overnumbered';
    if (metadata.alternate_art) return 'alt-art';
    return 'base';
  }
  const match = card.riftbound_id.match(OFFICIAL_ID);
  if (!match) return 'special';
  const [, number, letter, star, total] = match;
  if (star) return 'signature';
  if (letter) return 'alt-art';
  if (Number(number) > Number(total)) return 'overnumbered';
  return 'base';
}

/**
 * Convertit un set Riftcodex et ses cartes au format Binderbound (pure, testable).
 * Les noms n'existent qu'en anglais : le français reprend le nom anglais officiel.
 */
export function mapSet(meta, rawCards) {
  const isPromoSet = PROMO_SETS.has(meta.set_id);
  const cards = dedupe(rawCards)
    .toSorted((a, b) => a.collector_number - b.collector_number)
    .map((c) => {
      const name = c.name.trim();
      return {
        id: c.id,
        number: c.collector_number,
        name: { fr: name, en: name },
        type: c.classification.type.toLowerCase(),
        supertype: c.classification.supertype,
        domains: c.classification.domain.map((d) => d.toLowerCase()),
        rarity: c.classification.rarity.toLowerCase(),
        variant: variantOf(c, isPromoSet),
        baseCardId: null,
        imageUrl: c.media.image_url || null,
        orientation: c.orientation === 'landscape' ? 'landscape' : 'portrait',
        artist: c.media.artist || null,
      };
    });

  // Rattache chaque variante à sa base : même numéro (alt-art) ou même nom (overnumbered,
  // signature). Une variante sans base dans le set reste autonome (baseCardId = null).
  const bases = cards.filter((c) => c.variant === 'base');
  const byNumber = Map.groupBy(bases, (c) => c.number);
  const byName = Map.groupBy(bases, (c) => nameKey(c.name.en));
  // Repli pour un nom tronqué par la source (« Defender of Tomorrow » pour
  // « Jayce - Defender of Tomorrow ») : une seule base dont le nom finit par ce titre.
  const byTitle = (key) => {
    const found = bases.filter((b) => nameKey(b.name.en).endsWith(key));
    return found.length === 1 ? found[0] : undefined;
  };
  for (const card of cards) {
    if (card.variant === 'base' || card.variant === 'special') continue;
    const key = nameKey(card.name.en);
    const base =
      (card.variant === 'alt-art' && byNumber.get(card.number)?.[0]) ||
      byName.get(key)?.[0] ||
      byTitle(key);
    card.baseCardId = base?.id ?? null;
  }

  return {
    id: meta.set_id.toLowerCase(),
    code: meta.set_id,
    name: { fr: meta.name, en: meta.name },
    releaseDate: meta.published_on.slice(0, 10),
    kind: isPromoSet ? 'promo' : 'main',
    source: SOURCE,
    cards,
  };
}

async function getJson(path, signal) {
  const res = await fetch(`${API}${path}`, { signal });
  if (!res.ok) throw new Error(`Riftcodex ${path} → HTTP ${res.status}`);
  return res.json();
}

/** Toutes les pages d'une liste paginée. */
async function getAll(path, signal) {
  const sep = path.includes('?') ? '&' : '?';
  const first = await getJson(`${path}${sep}size=${PAGE_SIZE}&page=1`, signal);
  const rest = await Promise.all(
    Array.from({ length: first.pages - 1 }, (_, i) =>
      getJson(`${path}${sep}size=${PAGE_SIZE}&page=${i + 2}`, signal).then((r) => r.items),
    ),
  );
  return [first.items, ...rest].flat();
}

/** Télécharge les sets (tous, ou ceux dont le code est listé) au format Binderbound. */
export async function fetchSets({ codes, signal } = {}) {
  const metas = (await getAll('/sets', signal)).filter(
    (m) => !codes?.length || codes.includes(m.set_id.toUpperCase()),
  );
  return Promise.all(
    metas.map(async (meta) => mapSet(meta, await getAll(`/cards?set_id=${meta.set_id}`, signal))),
  );
}
