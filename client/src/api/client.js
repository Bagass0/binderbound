export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message ?? `HTTP ${status}`);
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details;
  }
}

async function request(path, init) {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  // 204 (pas de contenu) : body null.
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body);
  return body;
}

// Les GET sont mis en cache pour la session : les données de set ne changent pas.
const cache = new Map();
function cachedGet(path) {
  if (!cache.has(path)) {
    const promise = request(path).catch((err) => {
      cache.delete(path);
      throw err;
    });
    cache.set(path, promise);
  }
  return cache.get(path);
}

const send = (method, path, body, signal) =>
  request(path, { method, body: body && JSON.stringify(body), signal });
const enc = encodeURIComponent;

// Les données liées au compte ne passent jamais par le cache.
export const api = {
  config: () => cachedGet('/config'),
  sets: () => cachedGet('/sets'),
  set: (id) => cachedGet(`/sets/${enc(id)}`),
  prices: (id) => cachedGet(`/sets/${enc(id)}/prices`),
  fingerprints: (id) => cachedGet(`/sets/${enc(id)}/fingerprints`),
  layout: (params, signal) => send('POST', '/layout', params, signal),

  auth: {
    me: (signal) => request('/auth/me', { signal }),
    register: (body) => send('POST', '/auth/register', body),
    login: (body) => send('POST', '/auth/login', body),
    google: (credential) => send('POST', '/auth/google', { credential }),
    logout: () => send('POST', '/auth/logout'),
    deleteAccount: () => send('DELETE', '/auth/me'),
  },

  binders: {
    list: (signal) => request('/binders', { signal }),
    get: (id, signal) => request(`/binders/${enc(id)}`, { signal }),
    create: (body) => send('POST', '/binders', body),
    update: (id, body) => send('PATCH', `/binders/${enc(id)}`, body),
    remove: (id) => send('DELETE', `/binders/${enc(id)}`),
  },

  collection: {
    all: (signal) => request('/collection', { signal }),
    get: (setId, signal) => request(`/collection/${enc(setId)}`, { signal }),
    add: (setId, cardId) => send('PUT', `/collection/${enc(setId)}/cards/${enc(cardId)}`),
    remove: (setId, cardId) => send('DELETE', `/collection/${enc(setId)}/cards/${enc(cardId)}`),
    replace: (setId, cardIds) => send('PUT', `/collection/${enc(setId)}`, { cardIds }),
    import: (sets) => send('POST', '/collection/import', { sets }),
    addDouble: (setId, cardId) => send('PUT', `/collection/${enc(setId)}/doubles/${enc(cardId)}`),
    removeDouble: (setId, cardId) =>
      send('DELETE', `/collection/${enc(setId)}/doubles/${enc(cardId)}`),
  },

  friends: {
    list: (signal) => request('/friends', { signal }),
    add: (code) => send('POST', '/friends', { code }),
    accept: (id) => send('POST', `/friends/${enc(id)}/accept`),
    remove: (id) => send('DELETE', `/friends/${enc(id)}`),
    collection: (id, setId, signal) =>
      request(`/friends/${enc(id)}/collection/${enc(setId)}`, { signal }),
  },

  trades: {
    list: (signal) => request('/trades', { signal }),
    summary: (signal) => request('/trades/summary', { signal }),
    create: (body) => send('POST', '/trades', body),
    accept: (id) => send('POST', `/trades/${enc(id)}/accept`),
    decline: (id) => send('POST', `/trades/${enc(id)}/decline`),
    cancel: (id) => send('POST', `/trades/${enc(id)}/cancel`),
  },
};
