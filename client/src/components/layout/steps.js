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
