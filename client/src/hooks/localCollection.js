import { storage } from './storage.js';

const PREFIX = 'binderbound.collection.';

/** Collection d'un invité : un tableau d'identifiants par set, dans localStorage. */
export const localCollection = {
  load: (setId) => storage.get(PREFIX + setId, []),
  save: (setId, cardIds) => storage.set(PREFIX + setId, cardIds),

  /** Toutes les collections locales non vides : { [setId]: cardIds }. */
  all: () =>
    Object.fromEntries(
      storage
        .keys(PREFIX)
        .map((key) => [key.slice(PREFIX.length), storage.get(key, [])])
        .filter(([, ids]) => ids.length),
    ),

  clear: () => storage.keys(PREFIX).forEach((key) => storage.remove(key)),
};
