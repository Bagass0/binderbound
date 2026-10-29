import { z } from 'zod';
import { CARD_TYPES, DOMAINS, RARITIES, VARIANTS } from '../config/cardEnums.js';

const localized = z.object({ fr: z.string().min(1), en: z.string().min(1) });

export const cardSchema = z
  .object({
    id: z.string().min(1),
    number: z.number().int().nonnegative(),
    name: localized,
    type: z.enum(CARD_TYPES),
    domain: z.enum(DOMAINS),
    rarity: z.enum(RARITIES),
    variant: z.enum(VARIANTS),
    baseCardId: z.string().min(1).nullable(),
    imageUrl: z.url().nullable(),
  })
  .refine((c) => (c.variant === 'base') === (c.baseCardId === null), {
    message: 'Une carte "base" doit avoir baseCardId = null, une variante doit le renseigner',
    path: ['baseCardId'],
  });

export const setSchema = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'id en minuscules, chiffres et tirets'),
    code: z.string().min(1),
    name: localized,
    releaseDate: z.iso.date(),
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
      } else if (base.variant !== 'base') {
        ctx.addIssue({
          code: 'custom',
          message: `baseCardId "${card.baseCardId}" doit pointer vers une carte "base"`,
          path: ['cards', i, 'baseCardId'],
        });
      }
    });
  });
