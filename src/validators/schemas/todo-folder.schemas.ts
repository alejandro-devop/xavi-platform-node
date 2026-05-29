import { z } from 'zod';

export const folderIdString = z.string().regex(/^\d+$/, 'Invalid folder ID');
const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a hex value like #3B82F6');

export const todoFolderIdArgSchema = z.object({
  id: folderIdString,
});

export const optionalFolderIdSchema = z.union([folderIdString, z.null()]).optional();

export const todoFolderAddInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  color: hexColor,
  orderIndex: z.number().int().min(0).optional(),
});

export const todoFolderEditInputSchema = z
  .object({
    id: folderIdString,
    name: z.string().trim().min(1).max(100).optional(),
    color: hexColor.optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine((d) => d.name !== undefined || d.color !== undefined || d.orderIndex !== undefined, {
    message: 'At least one field is required to update',
  });
