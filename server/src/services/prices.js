import { gunzipSync } from 'node:zlib';

/**
 * Prix des cartes, en euros.
 *
 * - Card Nexus (si CARDNEXUS_API_KEY est défini) : prix de marché Cardmarket (EUR), à défaut
 *   l'annonce la moins chère du marché européen de Card Nexus. Les produits sont reliés aux
 *   cartes par leur identifiant TCGplayer, sinon par set + numéro imprimé + variante.
 * - TCGplayer (miroir quotidien et sans clé de tcgcsv.com) : complète les cartes que Card Nexus
 *   ne couvre pas, converti en euros au taux du jour de la BCE (frankfurter.dev).
 *
 * Chaque prix indique sa source (`src`) : le client peut le signaler.
 */

export const SOURCES = {
  cardnexus: { name: 'Card Nexus', url: 'https://www.cardnexus.com' },
  tcgplayer: { name: 'TCGplayer', url: 'https://www.tcgplayer.com' },
};
/** Les sources se mettent à jour une fois par jour : inutile de redemander plus souvent. */
const TTL = 6 * 3600e3;
/** tcgcsv refuse (401) les requêtes sans User-Agent identifiable, comme celui de Node. */
const USER_AGENT = 'Binderbound/1.0 (+https://binderbound.space)';

const TCGCSV = 'https://tcgcsv.com/tcgplayer/89'; // 89 : catégorie Riftbound
const TCGCSV_UPDATED = 'https://tcgcsv.com/last-updated.txt';
const CARDNEXUS = 'https://public-api.cardnexus.com/v1';
const RATE = 'https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR';

function createHttp(fetch, headers = {}) {
  const get = async (url, extra) => {
    const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT, ...headers, ...extra } });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    return res;
  };
  return { get, json: (url) => get(url).then((res) => res.json()) };
}

/**
 * Prix TCGplayer (USD) : { updatedAt, byProduct: Map(productId → { normal?, foil? }),
 * byNumber: Map(« ven|19a » → productId) }. Le catalogue (numéro imprimé de chaque produit)
 * relie les cartes que Riftcodex n'a pas encore associées à TCGplayer.
 */
export async function downloadTcgplayer(fetch) {
  const http = createHttp(fetch);
  // Date de la dernière mise à jour des prix (facultative), demandée en même temps que la liste.
  const updated = http
    .get(TCGCSV_UPDATED)
    .then((res) => res.text())
    .then((text) => (Number.isNaN(Date.parse(text.trim())) ? null : text.trim()))
    .catch(() => null);
  const { results: groups } = await http.json(`${TCGCSV}/groups`);
  const results = (g, path) => http.json(`${TCGCSV}/${g.groupId}/${path}`).then((r) => r.results);
  const [lists, catalogs, updatedAt] = await Promise.all([
    Promise.all(groups.map((g) => results(g, 'prices'))),
    // Catalogue facultatif : sans lui, seules les cartes déjà reliées ont un prix.
    Promise.all(groups.map((g) => results(g, 'products').catch(() => []))),
    updated,
  ]);
  const byProduct = new Map();
  for (const p of lists.flat()) {
    // Prix retenu : le prix de marché, à défaut le prix médian.
    const price = p.marketPrice ?? p.midPrice ?? null;
    if (price === null) continue;
    const entry = byProduct.get(String(p.productId)) ?? {};
    entry[p.subTypeName === 'Normal' ? 'normal' : 'foil'] = price;
    byProduct.set(String(p.productId), entry);
  }
  const byNumber = new Map();
  groups.forEach((group, i) => {
    const code = String(group.abbreviation ?? '').toLowerCase();
    for (const product of catalogs[i] ?? []) {
      const printed = product.extendedData?.find((e) => e.name === 'Number')?.value;
      const num = normalizeNumber(printed);
      if (!code || !num) continue;
      // Deux produits au même numéro (impression métal…) : ambigu, on n'en retient aucun.
      const key = `${code}|${num}`;
      byNumber.set(key, byNumber.has(key) ? null : String(product.productId));
    }
  });
  return { updatedAt, byProduct, byNumber };
}

/** Numéro imprimé comparable : « 007a » → « 7a », « R01 » → « r1 », « 019/166 » → « 19 ». */
export const normalizeNumber = (value) =>
  String(value ?? '')
    .split('/')[0]
    .trim()
    .toLowerCase()
    .replace(/^([a-z]*)0+(?=\d)/, '$1');

/** Variante d'un produit Card Nexus, à partir de son libellé libre. */
function variantKind(label) {
  if (!label) return 'base';
  if (/alt/i.test(label)) return 'alt-art';
  if (/sign/i.test(label)) return 'signature';
  if (/over/i.test(label)) return 'overnumbered';
  if (/metal/i.test(label)) return 'metal';
  return label.toLowerCase();
}

/** Clés de rapprochement d'une carte : identifiant « VEN-019A-166 », « OGN-299*-298 »… */
export function cardKeys(card) {
  const [code, number] = card.id.toLowerCase().split('-');
  const num = normalizeNumber(number);
  const kind = card.id.endsWith('-METAL') ? 'metal' : card.variant;
  // Une alt-art porte souvent le numéro de sa carte de base, sans le « a ».
  const bare = num.replace(/[a-z*]+$/, '');
  return [`${code}|${num}|${kind}`, `${code}|${bare}|${kind}`, `${code}|${num}|`];
}

/** Lit un fichier de flux Card Nexus (NDJSON gzippé) : une ligne par objet. */
async function readFeed(http, url) {
  const bytes = Buffer.from(await (await http.get(url)).arrayBuffer());
  const text = (bytes[0] === 0x1f && bytes[1] === 0x8b ? gunzipSync(bytes) : bytes).toString();
  return text
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
}

const amountOf = (value) => (typeof value === 'number' ? value : (value?.amount ?? null));

/** Prix d'une finition Card Nexus en euros : Cardmarket, sinon l'annonce européenne la moins chère. */
function finishPrice(block) {
  const eu = block?.cardnexus?.regions?.eu;
  return (
    block?.cardmarket?.marketValue ??
    amountOf(eu?.low) ??
    (block?.cardnexus?.low?.currency === 'EUR' ? amountOf(block.cardnexus.low) : null)
  );
}

/**
 * Prix Card Nexus (EUR) : { updatedAt, byTcgplayer: Map(id → prix), byKey: Map(clé → prix) }.
 * `game` : identifiant Card Nexus du jeu (« riftbound » par défaut).
 */
export async function downloadCardNexus(fetch, { apiKey, game }) {
  const http = createHttp(fetch, { Authorization: `Bearer ${apiKey}` });
  // Les réponses de l'API sont parfois enveloppées dans `data`.
  const meta = async (feed) => {
    const body = await http.json(`${CARDNEXUS}/feeds/${encodeURIComponent(game)}/${feed}`);
    return body.data ?? body;
  };
  const [expansionsMeta, catalogMeta, pricesMeta] = await Promise.all(
    ['expansions', 'catalog', 'prices'].map(meta),
  );
  const [expansions, catalog, priceRows] = await Promise.all([
    readFeed(http, expansionsMeta.url),
    readFeed(http, catalogMeta.url),
    readFeed(http, pricesMeta.url),
  ]);

  const codes = new Map(expansions.map((e) => [e.id, String(e.code ?? e.slug).toLowerCase()]));
  const pricesById = new Map();
  for (const row of priceRows) {
    const entry = {};
    for (const [finish, block] of Object.entries(row.pricesByFinish ?? {})) {
      const price = finishPrice(block);
      if (price === null) continue;
      entry[/standard|normal|non.?foil/i.test(finish) ? 'normal' : 'foil'] ??= price;
    }
    if (Object.keys(entry).length) pricesById.set(row.productId, entry);
  }

  const byTcgplayer = new Map();
  const byKey = new Map();
  for (const product of catalog) {
    const price = pricesById.get(product.id);
    if (product.productType === 'sealed' || !price) continue;
    for (const { id } of product.externalIds?.tcgplayer ?? []) byTcgplayer.set(String(id), price);
    const code = codes.get(product.expansionId);
    const num = normalizeNumber(product.printNumber);
    if (!code || !num) continue;
    // Clé précise (numéro + variante) et clé de repli (numéro seul, s'il est unique).
    byKey.set(`${code}|${num}|${variantKind(product.variant)}`, price);
    const loose = `${code}|${num}|`;
    byKey.set(loose, byKey.has(loose) ? null : price);
  }
  return { updatedAt: pricesMeta.generatedAt ?? null, byTcgplayer, byKey };
}

export function createPriceService({
  fetch = globalThis.fetch,
  cardNexus = null, // { apiKey, game }
  ttl = TTL,
  now = Date.now,
} = {}) {
  async function download() {
    const [nexus, tcg, rate] = await Promise.allSettled([
      cardNexus ? downloadCardNexus(fetch, cardNexus) : Promise.resolve(null),
      downloadTcgplayer(fetch),
      createHttp(fetch)
        .json(RATE)
        .then((r) => r.rates.EUR),
    ]);
    for (const failed of [nexus, tcg, rate].filter((r) => r.status === 'rejected'))
      console.error('[prix]', failed.reason?.message ?? failed.reason);
    if (!nexus.value && !tcg.value) throw new Error('Aucune source de prix disponible');
    return { nexus: nexus.value ?? null, tcg: tcg.value ?? null, rate: rate.value ?? null };
  }

  // Une seule requête en vol ; en cas d'échec on garde les derniers prix connus.
  let last = null; // { at, data }
  let pending = null;
  function snapshot() {
    if (last && now() - last.at < ttl) return Promise.resolve(last.data);
    pending ??= download()
      .then((data) => {
        // Taux indisponible : on garde le dernier connu.
        data.rate ??= last?.data.rate ?? null;
        last = { at: now(), data };
        return data;
      })
      .catch((err) => {
        if (last) return last.data;
        throw err;
      })
      .finally(() => {
        pending = null;
      });
    return pending;
  }

  const convert = (price, rate) =>
    Object.fromEntries(
      Object.entries(price).map(([k, v]) => [k, Math.round(v * rate * 100) / 100]),
    );

  return {
    /**
     * Prix des cartes d'un set, indexés par identifiant de carte (cartes sans prix absentes).
     * Sans Card Nexus ni taux de change, les prix restent en dollars.
     */
    async forCards(cards) {
      const { nexus, tcg, rate } = await snapshot();
      const currency = nexus || rate ? 'EUR' : 'USD';
      const prices = {};
      const used = new Set();
      for (const card of cards) {
        const [code, number] = card.id.toLowerCase().split('-');
        const id = card.tcgplayerId ?? tcg?.byNumber.get(`${code}|${normalizeNumber(number)}`);
        const fromNexus =
          nexus &&
          ((id && nexus.byTcgplayer.get(id)) ||
            cardKeys(card)
              .map((key) => nexus.byKey.get(key))
              .find(Boolean));
        if (fromNexus) {
          prices[card.id] = { ...fromNexus, src: 'cardnexus' };
          used.add('cardnexus');
          continue;
        }
        const fromTcg = id && tcg?.byProduct.get(id);
        if (!fromTcg || (currency === 'EUR' && !rate)) continue;
        prices[card.id] = {
          ...(currency === 'EUR' ? convert(fromTcg, rate) : fromTcg),
          src: 'tcgplayer',
        };
        used.add('tcgplayer');
      }
      const sources = ['cardnexus', 'tcgplayer'].filter((s) => used.has(s));
      return {
        source: SOURCES[sources[0] ?? (nexus ? 'cardnexus' : 'tcgplayer')],
        sources: sources.map((s) => ({ id: s, ...SOURCES[s] })),
        currency,
        updatedAt: nexus?.updatedAt ?? tcg?.updatedAt ?? new Date(now()).toISOString(),
        prices,
      };
    },
  };
}
