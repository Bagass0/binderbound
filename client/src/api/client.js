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

export const api = {
  config: () => cachedGet('/config'),
  sets: () => cachedGet('/sets'),
  set: (id) => cachedGet(`/sets/${encodeURIComponent(id)}`),
  layout: (params, signal) =>
    request('/layout', { method: 'POST', body: JSON.stringify(params), signal }),
};
