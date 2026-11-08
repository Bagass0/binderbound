/**
 * Prix des cartes : prix de marché TCGplayer (USD), via le miroir quotidien et sans clé de
 * tcgcsv.com. Chaque carte porte son identifiant de produit TCGplayer (`tcgplayerId`, fourni
 * par Riftcodex), ce qui distingue sans ambiguïté base, alt-art, overnumbered et signature.
 *
 * Pour brancher une autre source (Card Nexus avec une clé API, Cardmarket…), il suffit
 * d'exposer le même `forCards(cards)`.
 */

export const PRICE_SOURCE = { name: 'TCGplayer', url: 'https://www.tcgplayer.com' };
const API = 'https://tcgcsv.com/tcgplayer/89'; // 89 : catégorie Riftbound
const UPDATED = 'https://tcgcsv.com/last-updated.txt';
/** tcgcsv se met à jour une fois par jour : inutile de redemander plus souvent. */
const TTL = 6 * 3600e3;
/** tcgcsv refuse (401) les requêtes sans User-Agent identifiable, comme celui de Node. */
const HEADERS = { 'User-Agent': 'Binderbound/1.0 (+https://binderbound.space)' };

/** Prix retenu pour une impression : le prix de marché, à défaut le prix médian. */
const priceOf = (p) => p.marketPrice ?? p.midPrice ?? null;

export function createPriceService({ fetch = globalThis.fetch, ttl = TTL, now = Date.now } = {}) {
  const get = async (url) => {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
    return res;
  };
  const getJson = (path) => get(`${API}${path}`).then((res) => res.json());

  /** Tous les prix Riftbound : { updatedAt, byProduct: Map(productId → { normal?, foil? }) }. */
  async function download() {
    // Date de la dernière mise à jour des prix (facultative), demandée en même temps que la liste.
    const updated = get(UPDATED)
      .then((res) => res.text())
      .then((text) => (Number.isNaN(Date.parse(text.trim())) ? null : text.trim()))
      .catch(() => null);
    const { results: groups } = await getJson('/groups');
    const [lists, updatedAt] = await Promise.all([
      Promise.all(groups.map((g) => getJson(`/${g.groupId}/prices`).then((r) => r.results))),
      updated,
    ]);
    const byProduct = new Map();
    for (const p of lists.flat()) {
      const price = priceOf(p);
      if (price === null) continue;
      const entry = byProduct.get(String(p.productId)) ?? {};
      entry[p.subTypeName === 'Normal' ? 'normal' : 'foil'] = price;
      byProduct.set(String(p.productId), entry);
    }
    return { updatedAt: updatedAt ?? new Date(now()).toISOString(), byProduct };
  }

  // Une seule requête en vol ; en cas d'échec on garde les derniers prix connus.
  let last = null; // { at, data }
  let pending = null;
  function snapshot() {
    if (last && now() - last.at < ttl) return Promise.resolve(last.data);
    pending ??= download()
      .then((data) => {
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

  return {
    /** Prix des cartes d'un set, indexés par identifiant de carte (cartes sans prix absentes). */
    async forCards(cards) {
      const { updatedAt, byProduct } = await snapshot();
      const prices = {};
      for (const card of cards) {
        const price = card.tcgplayerId && byProduct.get(card.tcgplayerId);
        if (price) prices[card.id] = price;
      }
      return { source: PRICE_SOURCE, currency: 'USD', updatedAt, prices };
    },
  };
}
