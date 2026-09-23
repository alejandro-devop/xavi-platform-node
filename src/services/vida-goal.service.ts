import { activityCategoryService } from './activity-category.service';
import { getDbPool } from '../shared/database/pool';
import { ForbiddenError, NotFoundError } from '../shared/errors';
import type { ActivityCategory } from '../types/services/activity-category.types';
import type {
  SetCategoryGoalInput,
  SetGoalDaysInput,
  VidaGoal,
} from '../types/services/vida.types';

/**
 * La única meta que esta feature sabe crear. Nace sola la primera vez que una
 * categoría se apunta a una meta: no hay pantalla donde el usuario la nombre,
 * la configure o elija sus 480 minutos.
 *
 * El azul es el del núcleo de la paleta compartida del front
 * (`src/shared/ui/ColorPicker/color-palette.ts`, `blue` = #0284c7) y **no** el
 * #38bdf8 del render: ese hex no está en la paleta con la que el front pinta
 * categorías. Si se prefiere el tono del render, se cambia aquí y ya.
 */
export const WORK_GOAL = {
  slug: 'work',
  name: 'Trabajo',
  targetMinutes: 480,
  icon: 'briefcase',
  color: '#0284c7',
} as const;

type GoalRow = {
  id: string;
  user_id: number;
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  target_minutes: number;
  active_days: string[];
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

/** Lo mínimo de un cliente de `pg` que este servicio usa dentro de la transacción. */
type QueryRunner = {
  query<T extends object>(
    text: string,
    values?: unknown[]
  ): Promise<{ rows: T[]; rowCount: number | null }>;
};

function mapGoal(row: GoalRow): VidaGoal {
  return {
    id: row.id,
    userId: row.user_id,
    slug: row.slug,
    name: row.name,
    icon: row.icon,
    color: row.color,
    targetMinutes: row.target_minutes,
    activeDays: row.active_days,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * «Se crea sola la primera vez», sin carrera.
 *
 * `SELECT`-y-si-no-`INSERT` (lo que hace hoy `ensureDefaultCategoryId`) deja
 * abierta la ventana en la que dos toques casi a la vez crean dos metas
 * «Trabajo». Aquí son tres cosas a la vez: el índice único `(user_id, slug)` de
 * la migración 069, este upsert, y que el llamador lo corra dentro de la misma
 * transacción que escribe el puntero.
 *
 * El `DO UPDATE` con un valor que no cambia nada **no es un adorno**:
 * `DO NOTHING` no devuelve fila cuando hay conflicto, y el `SELECT` de rescate
 * puede no ver todavía la fila de la transacción concurrente bajo READ
 * COMMITTED — que es la carrera otra vez. `DO UPDATE` devuelve **y bloquea** la
 * fila existente.
 */
async function ensureDefaultGoal(client: QueryRunner, userId: number): Promise<GoalRow> {
  const result = await client.query<GoalRow>(
    `INSERT INTO vida_goals (user_id, slug, name, icon, color, target_minutes, order_index)
     VALUES ($1, $2, $3, $4, $5, $6, 0)
     ON CONFLICT (user_id, slug)
     DO UPDATE SET name = vida_goals.name
     RETURNING *`,
    [
      userId,
      WORK_GOAL.slug,
      WORK_GOAL.name,
      WORK_GOAL.icon,
      WORK_GOAL.color,
      WORK_GOAL.targetMinutes,
    ]
  );
  return result.rows[0];
}

async function getOwnedGoalRowOrThrow(
  client: QueryRunner,
  id: string,
  userId: number
): Promise<GoalRow> {
  const result = await client.query<GoalRow>('SELECT * FROM vida_goals WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new NotFoundError('Vida goal not found');
  }
  const row = result.rows[0];
  if (row.user_id !== userId) {
    throw new ForbiddenError('You do not have permission to access this vida goal');
  }
  return row;
}

async function listGoals(userId: number): Promise<VidaGoal[]> {
  const db = getDbPool();
  const result = await db.query<GoalRow>(
    `SELECT * FROM vida_goals WHERE user_id = $1 ORDER BY order_index ASC, name ASC`,
    [userId]
  );
  return result.rows.map(mapGoal);
}

async function getGoalById(id: string, userId: number): Promise<VidaGoal> {
  const db = getDbPool();
  return mapGoal(await getOwnedGoalRowOrThrow(db, id, userId));
}

/**
 * Apunta (o desapunta) una categoría a una meta. **Un viaje, una transacción.**
 *
 * Si hiciesen falta dos llamadas («crea la meta» y luego «apunta la categoría»)
 * habría una ventana de carrera en medio y un estado intermedio posible: meta
 * creada y categoría sin apuntar. Aquí el `ensure` y el `UPDATE` van dentro del
 * mismo `BEGIN … COMMIT`.
 */
async function setCategoryGoal(
  userId: number,
  input: SetCategoryGoalInput
): Promise<ActivityCategory> {
  // La categoría es suya (lanza NotFound o Forbidden) antes de abrir nada.
  await activityCategoryService.getCategoryById(input.categoryId, userId);

  const db = getDbPool();
  const client = await db.connect();
  try {
    await client.query('BEGIN');

    let goalId: string | null = null;
    if (input.attached) {
      goalId = input.goalId
        ? (await getOwnedGoalRowOrThrow(client, input.goalId, userId)).id
        : (await ensureDefaultGoal(client, userId)).id;
    }

    const updated = await client.query<{ id: string }>(
      `UPDATE activity_categories SET goal_id = $1 WHERE id = $2 AND user_id = $3 RETURNING id`,
      [goalId, input.categoryId, userId]
    );
    if (updated.rows.length === 0) {
      throw new ForbiddenError('You do not have permission to access this activity category');
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  return await activityCategoryService.getCategoryById(input.categoryId, userId);
}

/**
 * Cambia los días en que una meta cuenta. **Sin transacción a propósito:** es
 * un solo UPDATE de una sola fila, no hay `ensure` ni segundo escritor
 * (`setCategoryGoal` abre BEGIN porque son dos escrituras).
 *
 * El array vacío no llega hasta aquí: lo rechaza el validador, y detrás está
 * el CHECK (cardinality(active_days) >= 1) de la migración 070.
 */
async function setGoalDays(userId: number, input: SetGoalDaysInput): Promise<VidaGoal> {
  const db = getDbPool();
  // La meta es suya (lanza NotFound o Forbidden) antes de escribir nada.
  await getOwnedGoalRowOrThrow(db, input.goalId, userId);

  const result = await db.query<GoalRow>(
    `UPDATE vida_goals SET active_days = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *`,
    [input.activeDays, input.goalId, userId]
  );
  if (result.rows.length === 0) {
    throw new ForbiddenError('You do not have permission to access this vida goal');
  }
  return mapGoal(result.rows[0]);
}

export const vidaGoalService = {
  listGoals,
  getGoalById,
  setCategoryGoal,
  setGoalDays,
};
