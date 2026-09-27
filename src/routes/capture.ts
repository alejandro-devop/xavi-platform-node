import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../shared/utils/async-handler';
import { successResponse } from '../shared/utils/response';
import { UnauthorizedError, BadRequestError } from '../shared/errors';
import { verifyCaptureToken } from '../shared/utils/capture-token';
import { walletCaptureService } from '../services/wallet-capture.service';

/**
 * Anotar gastos desde fuera de la app: la acción «Registrar gasto» de iOS
 * (Siri, la automatización de Apple Pay en Atajos). Va aparte de las demás
 * rutas porque **no usa la sesión normal** sino el token de captura, que solo
 * sirve para esto. Ver `capture-token.ts`.
 */
const router = Router();

const captureSchema = z.object({
  amount: z.number().positive().max(1_000_000_000),
  description: z.string().trim().min(1).max(255),
  ref: z.string().trim().min(8).max(64),
  source: z.enum(['apple_pay', 'siri', 'shortcut']),
  date: z.string().date().optional(),
  cardName: z.string().trim().max(120).optional(),
});

router.post(
  '/expense',
  asyncHandler(async (req, res) => {
    const auth = req.headers.authorization ?? '';
    if (!auth.startsWith('Bearer ')) throw new UnauthorizedError('Missing capture token');
    const userId = verifyCaptureToken(auth.substring(7));

    const parsed = captureSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(
        parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
      );
    }

    const result = await walletCaptureService.capture(userId, parsed.data);
    res.status(result.duplicate ? 200 : 201).json(successResponse(result));
  })
);

export default router;
