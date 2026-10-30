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
  set: (id) => cachedGet(`/sets/${encodeURIComponent(id)}`),
  layout: (params, signal) => send('POST', '/layout', params, signal),

  auth: {
    me: (signal) => request('/auth/me', { signal }),
    register: (body) => send('POST', '/auth/register', body),
    login: (body) => send('POST', '/auth/login', body),
    google: (credential) => send('POST', '/auth/google', { credential }),
    logout: () => send('POST', '/auth/logout'),
  },

  binders: {
    list: (signal) => request('/binders', { signal }),
    get: (id, signal) => request(`/binders/${enc(id)}`, { signal }),
    create: (body) => send('POST', '/binders', body),
    update: (id, body) => send('PATCH', `/binders/${enc(id)}`, body),
    remove: (id) => send('DELETE', `/binders/${enc(id)}`),
  },

  collection: {
    get: (setId, signal) => request(`/collection/${enc(setId)}`, { signal }),
    add: (setId, cardId) => send('PUT', `/collection/${enc(setId)}/cards/${enc(cardId)}`),
    remove: (setId, cardId) => send('DELETE', `/collection/${enc(setId)}/cards/${enc(cardId)}`),
    replace: (setId, cardIds) => send('PUT', `/collection/${enc(setId)}`, { cardIds }),
    import: (sets) => send('POST', '/collection/import', { sets }),
  },
};
