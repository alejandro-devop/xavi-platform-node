import { z } from 'zod';

const uuidString = z.string().uuid('Invalid UUID');
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (use YYYY-MM-DD)');
const standupItemStatus = z.enum(['pending', 'in_progress', 'completed', 'blocked']);

export const standupMembersArgsSchema = z.object({
  includeInactive: z.boolean().optional(),
});

export const standupDateArgsSchema = z.object({
  date: dateString,
});

export const standupWeekArgsSchema = z.object({
  endDate: dateString,
  days: z.number().int().min(1).max(10).optional(),
});

export const standupMemberCreateInputSchema = z.object({
  name: z.string().min(1).max(120),
  orderIndex: z.number().int().min(0).optional(),
});

export const standupMemberUpdateInputSchema = z
  .object({
    id: uuidString,
    name: z.string().min(1).max(120).optional(),
    isActive: z.boolean().optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) => d.name !== undefined || d.isActive !== undefined || d.orderIndex !== undefined,
    { message: 'At least one field is required to update' }
  );

export const standupMemberDeleteInputSchema = z.object({
  id: uuidString,
});

export const standupItemCreateInputSchema = z
  .object({
    date: dateString,
    memberId: uuidString,
    title: z.string().min(1).max(300),
    notes: z.string().max(4000).nullish(),
    ticketNumber: z.string().max(64).nullish(),
    status: standupItemStatus.optional(),
    blockedReason: z.string().max(500).nullish(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine((d) => d.status !== 'blocked' || Boolean(d.blockedReason?.trim()), {
    message: 'blockedReason is required when status is blocked',
    path: ['blockedReason'],
  });

export const standupItemUpdateInputSchema = z
  .object({
    id: uuidString,
    memberId: uuidString.optional(),
    title: z.string().min(1).max(300).optional(),
    notes: z.string().max(4000).nullish(),
    ticketNumber: z.string().max(64).nullish(),
    status: standupItemStatus.optional(),
    blockedReason: z.string().max(500).nullish(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .refine(
    (d) =>
      d.memberId !== undefined ||
      d.title !== undefined ||
      d.notes !== undefined ||
      d.ticketNumber !== undefined ||
      d.status !== undefined ||
      d.blockedReason !== undefined ||
      d.orderIndex !== undefined,
    { message: 'At least one field is required to update' }
  )
  .refine((d) => d.status !== 'blocked' || Boolean(d.blockedReason?.trim()), {
    message: 'blockedReason is required when status is blocked',
    path: ['blockedReason'],
  });

export const standupItemDeleteInputSchema = z.object({
  id: uuidString,
});

export const standupCarryOverInputSchema = z.object({
  date: dateString,
  itemIds: z.array(uuidString).min(1).max(100),
});

export const standupItemCreateTodoInputSchema = z.object({
  itemId: uuidString,
});
