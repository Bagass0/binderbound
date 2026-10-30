/* Icônes SVG dessinées pour Binderbound (aucun asset officiel). */

const base = {
  width: '1em',
  height: '1em',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/** Emblème : un classeur en laiton traversé par une faille. */
export const Emblem = (props) => (
  <svg {...base} viewBox="0 0 32 32" strokeWidth={2} {...props}>
    <defs>
      <linearGradient id="bb-rift" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3ee0cc" />
        <stop offset=".55" stopColor="#8f7cff" />
        <stop offset="1" stopColor="#ff7ab0" />
      </linearGradient>
    </defs>
    <rect x="6" y="5" width="20" height="23" rx="3.5" stroke="#f0b85a" />
    <path d="M10 5v23" stroke="#f0b85a" strokeOpacity=".45" />
    <path d="M19 2.5 14 15h5.5l-4.5 14" stroke="url(#bb-rift)" strokeWidth={2.6} />
  </svg>
);

export const ChevronLeft = (p) => (
  <svg {...base} {...p}>
    <path d="m15 5-7 7 7 7" />
  </svg>
);
export const ChevronRight = (p) => (
  <svg {...base} {...p}>
    <path d="m9 5 7 7-7 7" />
  </svg>
);
export const Search = (p) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </svg>
);
export const Download = (p) => (
  <svg {...base} {...p}>
    <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />
  </svg>
);
export const Printer = (p) => (
  <svg {...base} {...p}>
    <path d="M7 9V4h10v5M7 17H5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-2M7 14h10v6H7z" />
  </svg>
);
export const Book = (p) => (
  <svg {...base} {...p}>
    <path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5Zm0 0v14" />
  </svg>
);
export const List = (p) => (
  <svg {...base} {...p}>
    <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
  </svg>
);
export const Check = (p) => (
  <svg {...base} {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
export const Warning = (p) => (
  <svg {...base} {...p}>
    <path d="M12 3 2 20h20L12 3Zm0 6v5m0 3h.01" />
  </svg>
);
export const Link = (p) => (
  <svg {...base} {...p}>
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);
export const User = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
  </svg>
);
export const Logout = (p) => (
  <svg {...base} {...p}>
    <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10" />
  </svg>
);
export const Save = (p) => (
  <svg {...base} {...p}>
    <path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4Zm3 0v5h7V4M8 20v-6h8v6" />
  </svg>
);
export const Plus = (p) => (
  <svg {...base} {...p}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);
export const Pencil = (p) => (
  <svg {...base} {...p}>
    <path d="m15 5 4 4L8 20H4v-4L15 5Z" />
  </svg>
);
export const Trash = (p) => (
  <svg {...base} {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </svg>
);

/** Glyphes par type de carte. */
const TYPE_PATHS = {
  legend: 'M4 17h16M5 17 3.5 7.5 8.5 11 12 5l3.5 6 5-3.5L19 17', // couronne
  champion:
    'M12 3 14.6 8.6 20.5 9.3 16.1 13.3 17.3 19.2 12 16.2 6.7 19.2 7.9 13.3 3.5 9.3 9.4 8.6Z', // étoile
  unit: 'M14.5 4.5 19.5 4.5 19.5 9.5 9 20 4 15ZM7 13l4 4M4 20l2-2', // épée
  spell: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18', // éclat
  gear: 'M12 3 19 6v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6Z', // bouclier
  rune: 'M12 3 19 12 12 21 5 12ZM12 8v8', // rune
  battlefield: 'M5 21V4M5 4h12l-2.5 4L17 12H5', // drapeau
};

export const TypeIcon = ({ type, ...p }) => (
  <svg {...base} {...p}>
    <path d={TYPE_PATHS[type] ?? TYPE_PATHS.rune} />
  </svg>
);
