/** Accès localStorage tolérant (navigation privée, stockage bloqué…). */
export const storage = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* stockage indisponible : on ignore */
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* stockage indisponible : on ignore */
    }
  },
  /** Clés commençant par `prefix`. */
  keys(prefix) {
    try {
      return Object.keys(localStorage).filter((k) => k.startsWith(prefix));
    } catch {
      return [];
    }
  },
};
