import { z } from 'zod';

// ~10MB of base64 (express body limit is 10mb). The app should downscale
// images to ~1600px before uploading — plenty for receipts and cheaper too.
const MAX_BASE64_LENGTH = 10_000_000;

export const expenseExtractionInputSchema = z.object({
  imageBase64: z
    .string()
    .min(100, 'Image data is too short to be a valid image')
    .max(MAX_BASE64_LENGTH, 'Image is too large (max ~7MB, resize it before uploading)')
    .regex(/^[A-Za-z0-9+/=\r\n]+$/, 'Image must be plain base64 (no data: URI prefix)'),
  // 'image/jpg' is non-standard but common (iOS camera) — normalize it to jpeg
  mediaType: z.preprocess(
    (value) => (value === 'image/jpg' ? 'image/jpeg' : value),
    z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif'], {
      errorMap: () => ({ message: 'Unsupported image type (use jpeg, png, webp or gif)' }),
    })
  ),
});
