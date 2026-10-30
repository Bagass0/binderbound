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
