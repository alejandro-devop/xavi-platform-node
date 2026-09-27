import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../errors';

/**
 * El token con el que el teléfono anota gastos desde fuera de la app (Siri,
 * Atajos), sin la sesión normal.
 *
 * - **Solo sirve para anotar.** Se firma con un secreto derivado del de acceso
 *   (`…:capture`), así que `verifyAccessToken` lo rechaza: no abre GraphQL ni
 *   ninguna ruta con `authMiddleware`. Si alguien lo sacara del teléfono, lo
 *   más que podría hacer es anotar gastos.
 * - **Largo, pero se renueva.** Dura un año y la app pide uno nuevo cada vez
 *   que se abre con sesión, así que en la práctica caduca si la app deja de
 *   usarse.
 */
const EXPIRA = '365d';

function secreto(): string {
  return `${process.env.JWT_ACCESS_SECRET}:capture`;
}

export function generateCaptureToken(userId: number): string {
  return jwt.sign({ sub: String(userId), scope: 'capture' }, secreto(), { expiresIn: EXPIRA });
}

export function verifyCaptureToken(token: string): number {
  try {
    const payload = jwt.verify(token, secreto()) as { sub?: string; scope?: string };
    const id = Number(payload.sub);
    if (payload.scope !== 'capture' || !Number.isInteger(id)) {
      throw new UnauthorizedError('Invalid capture token');
    }
    return id;
  } catch (error) {
    if (error instanceof UnauthorizedError) throw error;
    throw new UnauthorizedError('Invalid capture token');
  }
}
