import { z } from 'zod';

const LIST_CATEGORIES = ['restaurant', 'travel', 'outdoor', 'entertainment', 'culture', 'other'] as const;

/** Treats missing, null, or blank strings as null (optional GraphQL fields). */
function optionalTrimmedString(maxLength: number) {
  return z
    .string()
    .max(maxLength)
    .nullish()
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    });
}

/** Optional URL: omit, null, blank, or valid http(s) URL. */
function optionalUrl() {
  return z
    .string()
    .nullish()
    .transform((value) => {
      if (value == null) return null;
      const trimmed = value.trim();
      return trimmed === '' ? null : trimmed;
    })
    .pipe(z.union([z.null(), z.string().url('Invalid URL')]));
}

const swListInputFields = {
  title: z.string().min(2).max(100),
  description: z.string().max(500).nullish(),
  category: z.enum(LIST_CATEGORIES),
};

const swListUpdateInputFields = {
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullish(),
  category: z.enum(LIST_CATEGORIES).optional(),
};

const swListItemInputFields = {
  title: z.string().min(2).max(100),
  description: z.string().max(500).nullish(),
  address: optionalTrimmedString(500),
  url: optionalUrl(),
};

const swListItemUpdateInputFields = {
  title: z.string().min(2).max(100).optional(),
  description: z.string().max(500).nullish(),
  address: optionalTrimmedString(500),
  url: optionalUrl(),
};

export const swSendCinnamonRequestSchema = z.object({
  addresseeEmail: z.string().trim().email('Invalid email format'),
});

export const swRespondCinnamonRequestSchema = z.object({
  bondId: z.string().uuid(),
  accept: z.boolean(),
});

export const swDissolveBondSchema = z.object({
  bondId: z.string().uuid(),
});

/** Validates GraphQL `input` for swCreateList (inner object only). */
export const swCreateListSchema = z.object(swListInputFields);

export const swUpdateListSchema = z.object({
  id: z.string().uuid(),
  input: z.object(swListUpdateInputFields),
});

export const swDeleteListSchema = z.object({
  id: z.string().uuid(),
});

export const swListItemsSchema = z.object({
  listId: z.string().uuid(),
});

export const swAddListItemSchema = z.object({
  listId: z.string().uuid(),
  input: z.object(swListItemInputFields),
});

export const swUpdateListItemSchema = z.object({
  id: z.string().uuid(),
  input: z.object(swListItemUpdateInputFields),
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

/** Validates GraphQL `input` for swUpdatePreferences (inner object only). */
export const swUpdatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean().optional(),
  pushToken: z.string().nullish(),
  pushNotificationsEnabled: z.boolean().optional(),
});
