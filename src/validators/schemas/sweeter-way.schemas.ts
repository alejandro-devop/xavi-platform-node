import { z } from 'zod';

const LIST_CATEGORIES = ['restaurant', 'travel', 'outdoor', 'entertainment', 'culture', 'other'] as const;

export const swSendCinnamonRequestSchema = z.object({
  addresseeId: z.number().int().positive(),
});

export const swRespondCinnamonRequestSchema = z.object({
  bondId: z.string().uuid(),
  accept: z.boolean(),
});

export const swDissolveBondSchema = z.object({
  bondId: z.string().uuid(),
});

export const swCreateListSchema = z.object({
  input: z.object({
    title: z.string().min(2).max(100),
    description: z.string().max(500).nullish(),
    category: z.enum(LIST_CATEGORIES),
  }),
});

export const swUpdateListSchema = z.object({
  id: z.string().uuid(),
  input: z.object({
    title: z.string().min(2).max(100).optional(),
    description: z.string().max(500).nullish(),
    category: z.enum(LIST_CATEGORIES).optional(),
  }),
});

export const swDeleteListSchema = z.object({
  id: z.string().uuid(),
});

export const swListItemsSchema = z.object({
  listId: z.string().uuid(),
});

export const swAddListItemSchema = z.object({
  listId: z.string().uuid(),
  input: z.object({
    title: z.string().min(2).max(100),
    description: z.string().max(500).nullish(),
    address: z.string().max(500).nullish(),
    url: z.string().url().nullish(),
  }),
});

export const swUpdateListItemSchema = z.object({
  id: z.string().uuid(),
  input: z.object({
    title: z.string().min(2).max(100).optional(),
    description: z.string().max(500).nullish(),
    address: z.string().max(500).nullish(),
    url: z.string().url().nullish(),
  }),
});

export const swCompleteListItemSchema = z.object({
  id: z.string().uuid(),
});

export const swRateListItemSchema = z.object({
  id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  wouldReturn: z.boolean(),
});

export const swItemLogSchema = z.object({
  itemId: z.string().uuid(),
});

export const swUpsertItemLogSchema = z.object({
  itemId: z.string().uuid(),
  input: z.object({
    comment: z.string().max(1000).nullish(),
    liked: z.boolean().nullish(),
  }),
});

export const swMyNotificationsSchema = z.object({
  unreadOnly: z.boolean().optional(),
});

export const swMarkNotificationsReadSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
});

export const swUpdatePreferencesSchema = z.object({
  input: z.object({
    emailNotifications: z.boolean().optional(),
    inAppNotifications: z.boolean().optional(),
    pushToken: z.string().nullish(),
    pushNotificationsEnabled: z.boolean().optional(),
  }),
});
