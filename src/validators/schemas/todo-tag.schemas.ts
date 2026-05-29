import { z } from 'zod';

const tagIdString = z.string().regex(/^\d+$/, 'Invalid tag ID');
const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex value like #3B82F6');

export const todoTagIdArgSchema = z.object({
  id: tagIdString,
});

export const todoTagAddInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: hexColor,
});

export const todoTagEditInputSchema = z
  .object({
    id: tagIdString,
    name: z.string().trim().min(1).max(100).optional(),
    color: hexColor.optional(),
  })
  .refine((d) => d.name !== undefined || d.color !== undefined, {
    message: 'At least one field is required to update',
  });

export const tagIdsArraySchema = z.array(tagIdString).max(50).optional();
