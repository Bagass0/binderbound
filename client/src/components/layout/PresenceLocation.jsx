import { useContext, useState } from 'react';
import { UNSAFE_LocationContext as LocationContext } from 'react-router';
import { useIsPresent } from 'motion/react';

/**
 * Pendant son animation de sortie, une page garde l'URL qu'elle avait : sinon elle serait
 * re-rendue avec celle de la page suivante (ex. sans `?set=`, le garde RequireSet redirigerait
 * vers l'accueil). React Router n'expose ce contexte qu'en « UNSAFE_ ».
 */
export function PresenceLocation({ children }) {
  const isPresent = useIsPresent();
  const current = useContext(LocationContext);
  const [last, setLast] = useState(current);
  if (isPresent && last !== current) setLast(current);
  return <LocationContext value={isPresent ? current : last}>{children}</LocationContext>;
}
