import { z } from 'zod';
import {
  CARD_TYPES,
  DOMAINS,
  ORIENTATIONS,
  RARITIES,
  SET_KINDS,
  VARIANTS,
} from '../config/cardEnums.js';

const localized = z.object({ fr: z.string().min(1), en: z.string().min(1) });

export const cardSchema = z
  .object({
    id: z.string().min(1),
    number: z.number().int().nonnegative(),
    name: localized,
    type: z.enum(CARD_TYPES),
    /** Sur-type libre fourni par la source (Champion, Signature, Token…). */
    supertype: z.string().min(1).nullable().default(null),
    /** Un ou deux domaines ; le premier sert de couleur principale. */
    domains: z.array(z.enum(DOMAINS)).min(1),
    rarity: z.enum(RARITIES),
    variant: z.enum(VARIANTS),
    /** Carte de base d'une variante ; null pour une base ou une variante sans base dans le set. */
    baseCardId: z.string().min(1).nullable(),
    /** CDN de Riot, ou image servie par le site (/cards/…) pour une carte ajoutée à la main. */
    imageUrl: z.union([z.url(), z.string().regex(/^\/[\w./-]+$/)]).nullable(),
    orientation: z.enum(ORIENTATIONS).default('portrait'),
    artist: z.string().min(1).nullable().default(null),
  })
  .refine((c) => c.variant !== 'base' || c.baseCardId === null, {
    message: 'Une carte "base" doit avoir baseCardId = null',
    path: ['baseCardId'],
  });

export const setSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'id en minuscules, chiffres et tirets'),
    code: z.string().min(1),
    name: localized,
    releaseDate: z.iso.date(),
    kind: z.enum(SET_KINDS).default('main'),
    /** Couleur dominante de l'illustration de couverture (fond du classeur du set). */
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/)
      .nullable()
      .default(null),
    /** Provenance des données (affichée en crédit). */
    source: z.object({ name: z.string(), url: z.url() }).nullable().default(null),
    cards: z.array(cardSchema).min(1),
  })
  .superRefine((set, ctx) => {
    const ids = new Map(set.cards.map((c) => [c.id, c]));
    if (ids.size !== set.cards.length) {
      ctx.addIssue({
        code: 'custom',
        message: 'Identifiants de cartes en double',
        path: ['cards'],
      });
    }
    set.cards.forEach((card, i) => {
      if (card.baseCardId === null) return;
      const base = ids.get(card.baseCardId);
      if (!base) {
        ctx.addIssue({
          code: 'custom',
          message: `baseCardId "${card.baseCardId}" introuvable`,
          path: ['cards', i, 'baseCardId'],
        });
      } else if (base.variant !== 'base' && base.variant !== 'special') {
        // Une variante vise une carte de base, ou une carte hors série (rune alternative).
        ctx.addIssue({
          code: 'custom',
          message: `baseCardId "${card.baseCardId}" doit pointer vers une carte "base" ou "special"`,
          path: ['cards', i, 'baseCardId'],
        });
      }
    });
  });
