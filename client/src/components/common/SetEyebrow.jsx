import { useTranslation } from 'react-i18next';
import { useSet } from '../../hooks/useConfig.js';
import { localizedName } from '../../lib/format.js';

/** Surtitre des étapes : rappelle le set en cours (« VEN · Vendetta »). */
export function SetEyebrow({ setId }) {
  const { i18n } = useTranslation();
  const { data: set } = useSet(setId);
  return set ? `${set.code} · ${localizedName(set, i18n.language)}` : ' ';
}
