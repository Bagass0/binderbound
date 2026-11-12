import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

// Titre de l'onglet par route. Seul l'accueil est indexé : les autres pages dépendent
// de paramètres d'URL (set, format…) ou d'un compte et n'ont rien à faire dans Google.
const TITLES = {
  '/binder': 'binder.title',
  '/options': 'options.title',
  '/result': 'result.title',
  '/login': 'auth.title.login',
  '/binders': 'binders.title',
  '/collection': 'collectionPage.title',
  '/amis': 'friends.title',
  '/echanges': 'trades.title',
  '/echanges/nouveau': 'compose.title',
};

export function usePageMeta(pathname) {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const key = TITLES[pathname] ?? (pathname.startsWith('/collection/') && TITLES['/collection']);
    // Accueil : même titre que index.html (celui que Google indexe après rendu).
    document.title = key ? `${t(key)} · ${t('app.name')}` : t('app.homeTitle');

    let robots = document.querySelector('meta[name="robots"]');
    if (pathname === '/') {
      robots?.remove();
    } else {
      if (!robots) {
        robots = document.createElement('meta');
        robots.name = 'robots';
        document.head.append(robots);
      }
      robots.content = 'noindex';
    }
  }, [pathname, t, i18n.language]);
}
