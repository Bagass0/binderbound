import { z } from 'zod';
import { GRID_LIMITS, SORT_OPTIONS, VARIANT_MODES, VARIANT_TYPES } from '../config/cardEnums.js';

const email = z
  .email()
  .max(254)
  .transform((e) => e.toLowerCase());
const name = z.string().trim().min(1).max(80);

export const registerSchema = z.object({
  email,
  name,
  password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const googleLoginSchema = z.object({ credential: z.string().min(1).max(4096) });

const gridSize = z.number().int().min(GRID_LIMITS.min).max(GRID_LIMITS.max);

/**
 * Réglages d'un classeur, tels que le client les manipule (mêmes clés que ses paramètres d'URL).
 * `includedVariants: null` = toutes les variantes ; `breakByGroup` = coupure selon le tri.
 */
export const binderParamsSchema = z.object({
  setId: z.string().min(1).max(32),
  rows: gridSize.default(3),
  cols: gridSize.default(3),
  doubleSided: z.boolean().default(true),
  sortBy: z.enum(SORT_OPTIONS).default('number'),
  variantMode: z.enum(VARIANT_MODES).default('after-base'),
  includedVariants: z.array(z.enum(VARIANT_TYPES)).nullable().default(null),
  breakByGroup: z.boolean().default(false),
  reservedFaces: z.number().int().min(0).max(50).default(0),
  startOnRight: z.boolean().default(false),
});

export const binderCreateSchema = z.object({ name, params: binderParamsSchema });

export const binderUpdateSchema = z
  .object({ name, params: binderParamsSchema })
  .partial()
  .refine((b) => b.name !== undefined || b.params !== undefined, 'Rien à modifier');

export const idParamSchema = z.coerce.number().int().positive();

const cardIds = z.array(z.string().min(1).max(64)).max(2000);

export const collectionReplaceSchema = z.object({ cardIds });

/** Import de la collection locale : { sets: { [setId]: [cardId…] } }. */
export const collectionImportSchema = z.object({
  sets: z.record(z.string().min(1).max(32), cardIds),
});

/** Code ami saisi à la main : espaces et tirets ignorés, casse indifférente. */
export const friendRequestSchema = z.object({
  code: z
    .string()
    .max(32)
    .transform((c) => c.replace(/[\s-]/g, '').toUpperCase())
    .pipe(z.string().regex(/^[A-Z0-9]{8}$/)),
});

const tradeCards = z.array(z.string().min(1).max(64)).max(30);

/** Proposition d'échange : au moins une carte, jamais la même des deux côtés. */
export const tradeCreateSchema = z
  .object({
    friendId: z.number().int().positive(),
    setId: z.string().min(1).max(32),
    give: tradeCards,
    receive: tradeCards,
    message: z.string().trim().max(280).optional(),
  })
  .transform((t) => ({ ...t, give: [...new Set(t.give)], receive: [...new Set(t.receive)] }))
  .refine((t) => t.give.length + t.receive.length > 0, 'Échange vide')
  .refine((t) => !t.give.some((id) => t.receive.includes(id)), 'Même carte des deux côtés');

export const directoryQuerySchema = z.object({
  q: z.string().trim().max(80).default(''),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});

export const discoverableSchema = z.object({ discoverable: z.boolean() });
