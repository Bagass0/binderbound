/** Les 4 étapes du parcours, dans l'ordre. */
export const STEPS = [
  { key: 'set', path: '/' },
  { key: 'binder', path: '/binder' },
  { key: 'options', path: '/options' },
  { key: 'result', path: '/result' },
];

export const stepIndex = (pathname) =>
  Math.max(
    STEPS.findIndex((s) => s.path === pathname),
    0,
  );

/**
 * Barre d'étapes visible à partir de l'étape 2 : l'accueil (choix du set) sert aussi de page
 * d'entrée, et les pages hors parcours (connexion, classeurs, collection) n'en ont pas.
 */
export const showsStepper = (pathname) => STEPS.slice(1).some((s) => s.path === pathname);
