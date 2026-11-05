import { useId } from 'react';

/**
 * Gemmes de rareté de Riftbound, telles qu'imprimées en bas des cartes : perle blanche
 * (commune), triangle turquoise (peu commune), losange rose (rare), pentagone orange (épique),
 * hexagone doré (showcase : alt-arts et overnumbered). Les facettes sont éclairées depuis le
 * haut à gauche. La rareté « promo » n'a pas de gemme officielle (une carte promo porte celle
 * de sa vraie rareté) : une étoile argentée la distingue.
 */
const GEMS = {
  uncommon: {
    points: [
      [12, 2],
      [22.5, 20.5],
      [1.5, 20.5],
    ],
    center: [12, 14.3],
    light: '#7fe6da',
    mid: '#25b3a6',
    dark: '#0b6560',
  },
  rare: {
    points: [
      [12, 1.5],
      [22.5, 12],
      [12, 22.5],
      [1.5, 12],
    ],
    center: [12, 12],
    light: '#f7a3d3',
    mid: '#d4268c',
    dark: '#71105a',
  },
  epic: {
    points: [
      [12, 1.5],
      [22.5, 9.2],
      [18.5, 21.5],
      [5.5, 21.5],
      [1.5, 9.2],
    ],
    center: [12, 12.6],
    light: '#ffc85a',
    mid: '#f5821e',
    dark: '#b03a14',
  },
  showcase: {
    points: [
      [12, 1.5],
      [21.5, 7],
      [21.5, 17],
      [12, 22.5],
      [2.5, 17],
      [2.5, 7],
    ],
    center: [12, 12],
    light: '#fff07a',
    mid: '#f4c412',
    dark: '#a3740c',
  },
};

const LIGHT = (-3 * Math.PI) / 4; // lumière venant du haut à gauche
const hex = (c) => c.match(/\w\w/g).map((h) => parseInt(h, 16));
const mix = (a, b, t) =>
  `rgb(${hex(a)
    .map((v, i) => Math.round(v + (hex(b)[i] - v) * t))
    .join(' ')})`;

/** Teinte d'une facette selon son orientation par rapport à la lumière. */
function facets({ points, center, light, mid, dark }) {
  return points.map((p, i) => {
    const q = points[(i + 1) % points.length];
    const angle = Math.atan2((p[1] + q[1]) / 2 - center[1], (p[0] + q[0]) / 2 - center[0]);
    const t = (1 - Math.cos(angle - LIGHT)) / 2; // 0 face à la lumière, 1 à l'opposé
    const fill = t < 0.5 ? mix(light, mid, t * 2) : mix(mid, dark, (t - 0.5) * 2);
    return { d: `M${center}L${p}L${q}Z`, fill };
  });
}

export function RarityGem({ rarity, className = '', title }) {
  const id = useId();
  const label = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };

  if (rarity === 'common') {
    return (
      <svg viewBox="0 0 24 24" className={className} {...label}>
        <defs>
          <radialGradient id={`${id}p`} cx="40%" cy="38%" r="65%">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.55" stopColor="#d6dde6" />
            <stop offset="0.85" stopColor="#b9c2cf" />
            <stop offset="1" stopColor="#e8f1e4" />
          </radialGradient>
        </defs>
        <circle cx="12" cy="12" r="10.5" fill={`url(#${id}p)`} />
        {/* Reflet en arc et irisation, comme une perle */}
        <path
          d="M6.2 9.5a6.5 6.5 0 0 1 6.3-4.7"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinecap="round"
          fill="none"
          opacity="0.9"
        />
        <circle cx="12" cy="12" r="10.5" fill="none" stroke="#9fb0bf" strokeWidth="0.6" />
      </svg>
    );
  }

  const gem = GEMS[rarity];
  if (!gem) {
    // Promo : étoile argentée à quatre branches.
    return (
      <svg viewBox="0 0 24 24" className={className} {...label}>
        <path
          d="M12 1.5 14.6 9.4 22.5 12l-7.9 2.6L12 22.5l-2.6-7.9L1.5 12l7.9-2.6Z"
          fill="#d8dde8"
          stroke="#8f98aa"
          strokeWidth="0.6"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" className={className} {...label}>
      {facets(gem).map((f) => (
        <path key={f.d} d={f.d} fill={f.fill} />
      ))}
      {/* Arêtes claires qui partent du centre, puis le contour */}
      {gem.points.map((p) => (
        <path
          key={p}
          d={`M${gem.center}L${p}`}
          stroke="#fff"
          strokeOpacity="0.45"
          strokeWidth="0.5"
        />
      ))}
      <polygon
        points={gem.points.join(' ')}
        fill="none"
        stroke={gem.dark}
        strokeWidth="0.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
