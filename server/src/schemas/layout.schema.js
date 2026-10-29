import { z } from 'zod';
import {
  BREAK_OPTIONS,
  GRID_LIMITS,
  SORT_OPTIONS,
  VARIANT_MODES,
  VARIANT_TYPES,
} from '../config/cardEnums.js';

const gridSize = z.number().int().min(GRID_LIMITS.min).max(GRID_LIMITS.max);

/** Options de placement (sans le setId) : partagées par l'API et computeLayout. */
export const layoutOptionsSchema = z.object({
  rows: gridSize.default(3),
  cols: gridSize.default(3),
  doubleSided: z.boolean().default(true),
  sortBy: z.enum(SORT_OPTIONS).default('number'),
  variantMode: z.enum(VARIANT_MODES).default('after-base'),
  includedVariants: z.array(z.enum(VARIANT_TYPES)).default([...VARIANT_TYPES]),
  breakBy: z.enum(BREAK_OPTIONS).nullable().default(null),
  reservedFaces: z.number().int().min(0).max(50).default(0),
  startOnRight: z.boolean().default(false),
  maxPages: z.number().int().positive().nullable().default(null),
});

export const layoutRequestSchema = layoutOptionsSchema.extend({
  setId: z.string().min(1),
});
