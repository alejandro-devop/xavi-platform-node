import { ForbiddenError } from '../../../src/shared/errors';
import { vidaGoalService, WORK_GOAL } from '../../../src/services/vida-goal.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const OTHER_USER_ID = 2;
const CATEGORY_ID = '019c7d42-15dc-7000-8000-000000000099';
const GOAL_ID = '019c7d42-15dc-7000-8000-0000000000a1';

function categoryRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-09-22T12:00:00Z');
  return {
    id: CATEGORY_ID,
    user_id: USER_ID,
    order_index: 0,
    name: 'Curro',
    description: null,
    icon: null,
    color: null,
    goal_id: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function goalRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-09-22T12:00:00Z');
  return {
    id: GOAL_ID,
    user_id: USER_ID,
    slug: WORK_GOAL.slug,
    name: WORK_GOAL.name,
    icon: WORK_GOAL.icon,
    color: WORK_GOAL.color,
    target_minutes: WORK_GOAL.targetMinutes,
    active_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    order_index: 0,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/** Las llamadas del cliente de la transacción, en orden, sin BEGIN/COMMIT/ROLLBACK. */
function statements(mock: jest.Mock): string[] {
  return mock.mock.calls
    .map((call) => String(call[0]))
    .filter((sql) => !['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql.trim()));
}

describe('VidaGoalService', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(() => {
    resetAllMocks();
    mockClient.query.mockReset();
    mockClient.release.mockReset();
    mockDbPool.connect.mockResolvedValue(mockClient as never);
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('setCategoryGoal', () => {
    it('creates the default goal with the upsert and points the category at it', async () => {
      // El pool: comprobación de propiedad antes de la tx, y relectura tras el COMMIT.
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [categoryRow()] })
        .mockResolvedValueOnce({ rows: [categoryRow({ goal_id: GOAL_ID })] });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [goalRow()] }) // upsert
        .mockResolvedValueOnce({ rows: [{ id: CATEGORY_ID }] }) // UPDATE del puntero
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const category = await vidaGoalService.setCategoryGoal(USER_ID, {
        categoryId: CATEGORY_ID,
        attached: true,
      });

      expect(category.goalId).toBe(GOAL_ID);

      const calls = mockClient.query.mock.calls.map((call) => String(call[0]).trim());
      expect(calls[0]).toBe('BEGIN');
      expect(calls[calls.length - 1]).toBe('COMMIT');

      const [upsert, update] = statements(mockClient.query);
      expect(upsert).toContain('INSERT INTO vida_goals');
      expect(upsert).toContain('ON CONFLICT (user_id, slug)');
      // DO NOTHING no devolvería fila: el DO UPDATE es lo que cierra la carrera.
      expect(upsert).toContain('DO UPDATE SET name = vida_goals.name');
      expect(upsert).toContain('RETURNING *');
      expect(mockClient.query.mock.calls[1][1]).toEqual([
        USER_ID,
        'work',
        'Trabajo',
        'briefcase',
        '#0284c7',
        480,
      ]);

      // El INSERT no lista active_days a propósito: el DEFAULT de la migración 070
      // (lunes a viernes) es lo que hace nacer la meta con sus días, así que este
      // upsert anticarrera no se toca. Si alguien añade la columna aquí, este test
      // lo dice.
      expect(upsert).not.toContain('active_days');

      expect(update).toContain('UPDATE activity_categories SET goal_id');
      expect(mockClient.query.mock.calls[2][1]).toEqual([GOAL_ID, CATEGORY_ID, USER_ID]);
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('reuses the existing goal instead of creating a second one', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [categoryRow()] })
        .mockResolvedValueOnce({ rows: [categoryRow({ goal_id: GOAL_ID })] });

      // El mismo upsert devuelve la fila ya existente (rama ON CONFLICT).
      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [goalRow({ name: 'Curro' })] })
        .mockResolvedValueOnce({ rows: [{ id: CATEGORY_ID }] })
        .mockResolvedValueOnce({ rows: [] });

      const category = await vidaGoalService.setCategoryGoal(USER_ID, {
        categoryId: CATEGORY_ID,
        attached: true,
      });

      expect(category.goalId).toBe(GOAL_ID);
      const inserts = statements(mockClient.query).filter((sql) =>
        sql.includes('INSERT INTO vida_goals')
      );
      expect(inserts).toHaveLength(1);
    });

    it('clears the pointer without touching vida_goals when attached is false', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [categoryRow({ goal_id: GOAL_ID })] })
        .mockResolvedValueOnce({ rows: [categoryRow()] });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: CATEGORY_ID }] })
        .mockResolvedValueOnce({ rows: [] });

      const category = await vidaGoalService.setCategoryGoal(USER_ID, {
        categoryId: CATEGORY_ID,
        attached: false,
      });

      expect(category.goalId).toBeNull();
      const sqls = statements(mockClient.query);
      expect(sqls.some((sql) => sql.includes('vida_goals'))).toBe(false);
      expect(mockClient.query.mock.calls[1][1]).toEqual([null, CATEGORY_ID, USER_ID]);
    });

    it("refuses a category that belongs to someone else, before opening a transaction", async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [categoryRow({ user_id: OTHER_USER_ID })] });

      await expect(
        vidaGoalService.setCategoryGoal(USER_ID, { categoryId: CATEGORY_ID, attached: true })
      ).rejects.toThrow(ForbiddenError);

      expect(mockDbPool.connect).not.toHaveBeenCalled();
    });

    it('rolls back and releases when the pointer update matches no row', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [categoryRow()] });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [goalRow()] }) // upsert
        .mockResolvedValueOnce({ rows: [] }) // UPDATE sin filas
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        vidaGoalService.setCategoryGoal(USER_ID, { categoryId: CATEGORY_ID, attached: true })
      ).rejects.toThrow(ForbiddenError);

      const calls = mockClient.query.mock.calls.map((call) => String(call[0]).trim());
      expect(calls[calls.length - 1]).toBe('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('refuses an explicit goal that belongs to someone else', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [categoryRow()] });

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [goalRow({ user_id: OTHER_USER_ID })] }) // SELECT de la meta
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      await expect(
        vidaGoalService.setCategoryGoal(USER_ID, {
          categoryId: CATEGORY_ID,
          attached: true,
          goalId: GOAL_ID,
        })
      ).rejects.toThrow(ForbiddenError);

      const calls = mockClient.query.mock.calls.map((call) => String(call[0]).trim());
      expect(calls[calls.length - 1]).toBe('ROLLBACK');
      expect(statements(mockClient.query).some((sql) => sql.includes('INSERT INTO'))).toBe(false);
    });
  });

  describe('getGoalById', () => {
    it('maps the row and refuses another user goal', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [goalRow()] });
      const goal = await vidaGoalService.getGoalById(GOAL_ID, USER_ID);
      expect(goal).toMatchObject({
        id: GOAL_ID,
        slug: 'work',
        name: 'Trabajo',
        targetMinutes: 480,
        activeDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        orderIndex: 0,
      });

      mockDbPool.query.mockResolvedValueOnce({ rows: [goalRow({ user_id: OTHER_USER_ID })] });
      await expect(vidaGoalService.getGoalById(GOAL_ID, USER_ID)).rejects.toThrow(ForbiddenError);
    });

    it('carries whatever days the row has, not the five of the default', async () => {
      // Una meta de siete días («Sueño») sale tal cual: el servicio no normaliza
      // ni completa nada, los días son de la fila.
      mockDbPool.query.mockResolvedValueOnce({
        rows: [
          goalRow({
            slug: 'sleep',
            name: 'Sueño',
            active_days: [
              'monday',
              'tuesday',
              'wednesday',
              'thursday',
              'friday',
              'saturday',
              'sunday',
            ],
          }),
        ],
      });

      const goal = await vidaGoalService.getGoalById(GOAL_ID, USER_ID);
      expect(goal.activeDays).toEqual([
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday',
      ]);
    });
  });

  describe('setGoalDays', () => {
    it('saves the days of an owned goal and returns the goal mapped', async () => {
      mockDbPool.query
        // getOwnedGoalRowOrThrow
        .mockResolvedValueOnce({ rows: [goalRow()] })
        // UPDATE … RETURNING *
        .mockResolvedValueOnce({
          rows: [goalRow({ active_days: ['monday', 'wednesday', 'saturday'] })],
        });

      const goal = await vidaGoalService.setGoalDays(USER_ID, {
        goalId: GOAL_ID,
        activeDays: ['monday', 'wednesday', 'saturday'],
      });

      expect(goal.activeDays).toEqual(['monday', 'wednesday', 'saturday']);
      expect(statements(mockDbPool.query as unknown as jest.Mock)[1]).toContain(
        'UPDATE vida_goals SET active_days'
      );
      expect((mockDbPool.query as unknown as jest.Mock).mock.calls[1][1]).toEqual([
        ['monday', 'wednesday', 'saturday'],
        GOAL_ID,
        USER_ID,
      ]);
      // Un solo UPDATE: nada de transacción.
      expect(mockDbPool.connect).not.toHaveBeenCalled();
    });

    it('refuses a goal that belongs to someone else, before the UPDATE', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [goalRow({ user_id: OTHER_USER_ID })] });

      await expect(
        vidaGoalService.setGoalDays(USER_ID, { goalId: GOAL_ID, activeDays: ['monday'] })
      ).rejects.toThrow(ForbiddenError);

      expect(mockDbPool.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('listGoals', () => {
    it('maps active_days of every goal', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [goalRow(), goalRow({ slug: 'sleep', active_days: ['saturday', 'sunday'] })],
      });

      const goals = await vidaGoalService.listGoals(USER_ID);
      expect(goals.map((goal) => goal.activeDays)).toEqual([
        ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        ['saturday', 'sunday'],
      ]);
    });
  });
});
