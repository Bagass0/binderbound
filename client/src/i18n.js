import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';
import { storage } from './hooks/storage.js';

export const LANGUAGES = ['fr', 'en'];
const STORAGE_KEY = 'binderbound.lang';

const saved = storage.get(STORAGE_KEY);

i18n.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: LANGUAGES.includes(saved) ? saved : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  storage.set(STORAGE_KEY, lng);
  document.documentElement.lang = lng;
});
document.documentElement.lang = i18n.language;

export default i18n;
