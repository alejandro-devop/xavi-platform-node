import { habitService } from '../../../src/services/habit.service';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const HABIT_ID = 10;
const LOG_ID = 12;

const habitRow = {
  id: HABIT_ID,
  user_id: USER_ID,
  name: 'Exercise',
  habit_type: 'boolean',
  target_count: 1,
  daily_goal: 1,
  timer_goal: 0,
  times_goal: 0,
  weekly_lifelines: 0,
  streak: 0,
  max_streak: 0,
  days: 0,
  period_days: 0,
  restart_count: 0,
  end_date: null,
  hidden: false,
  status: 'active',
};

const logRow = {
  id: LOG_ID,
  habit_id: HABIT_ID,
  user_id: USER_ID,
  completed_date: '2026-09-24',
  count: 1,
  time: 0,
  notes: null,
  story: null,
  archived: false,
  is_accomplished: true,
  is_failed: false,
  difficulty: null,
  is_lifeline: false,
  time_of_day: '22:15:00',
  created_at: new Date('2026-09-24T22:15:00Z'),
  updated_at: new Date('2026-09-24T22:15:00Z'),
};

/** ¿Ya hay un seguimiento de ese día? Decide si addHabitLog fusiona o inserta. */
let dayHasLog = false;

/** Responde a cada SELECT lo que el servicio espera; lo demás, una fila neutra. */
function mockPool() {
  const query = jest.fn(async (sql: string) => {
    if (/FROM habit_logs hl\s+WHERE hl\.id/.test(sql)) return { rows: [logRow] };
    if (/FROM habits\s+WHERE id|FROM habits WHERE id/.test(sql)) return { rows: [habitRow] };
    if (/^\s*UPDATE habit_logs/.test(sql)) return { rows: [logRow] };
    if (/^\s*INSERT INTO habit_logs/.test(sql)) return { rows: [logRow] };
    if (/SELECT \* FROM habit_logs WHERE habit_id/.test(sql)) {
      return { rows: dayHasLog ? [logRow] : [] };
    }
    // Las consultas de racha (MAX(completed_date), max_streak, contadores) se
    // responden con una fila neutra: esta suite mira el UPDATE, no la racha.
    return { rows: [{ latest: '2026-09-24', max_streak: 0, cnt: '0', count: '0' }] };
  });
  mockGetDbPool.mockReturnValue({ query } as never);
  return query;
}

function habitLogsUpdate(query: jest.Mock) {
  const call = query.mock.calls.find((c) => /^\s*UPDATE habit_logs/.test(c[0] as string));
  if (!call) throw new Error('no UPDATE habit_logs was issued');
  return { sql: call[0] as string, params: call[1] as unknown[] };
}

function habitLogsInsert(query: jest.Mock) {
  const call = query.mock.calls.find((c) => /^\s*INSERT INTO habit_logs/.test(c[0] as string));
  if (!call) throw new Error('no INSERT INTO habit_logs was issued');
  return { sql: call[0] as string, params: call[1] as unknown[] };
}

describe('habitFollowUpEdit: la hora que no viene y la hora vacía no son lo mismo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    dayHasLog = true;
  });

  it('sets the clock time when it is sent', async () => {
    const query = mockPool();

    await habitService.updateHabitFollowUp(String(LOG_ID), USER_ID, { timeOfDay: '07:05' });

    const { sql, params } = habitLogsUpdate(query);
    expect(sql).toContain('time_of_day = CASE WHEN $9::boolean THEN $10::time ELSE time_of_day END');
    expect(params[8]).toBe(true);
    expect(params[9]).toBe('07:05');
    // **El `id` en su sitio, y el array con la longitud exacta.** Lo pidio el
    // revisor y tiene razon: el mock devuelve la misma fila mire los
    // parametros que mire, asi que un `id` corrido —lo unico que puede romper
    // una renumeracion de `$n`— pasaria en verde sin estas dos lineas.
    expect(params).toHaveLength(11);
    expect(params[10]).toBe(LOG_ID); // llega convertido a numero
  });

  it('leaves the stored time alone when the field does not travel', async () => {
    const query = mockPool();

    await habitService.updateHabitFollowUp(String(LOG_ID), USER_ID, { notes: 'sin tocar la hora' });

    const { params } = habitLogsUpdate(query);
    expect(params[8]).toBe(false);
    expect(params[9]).toBeNull();
  });

  it('clears the stored time when it travels empty', async () => {
    const query = mockPool();

    await habitService.updateHabitFollowUp(String(LOG_ID), USER_ID, { timeOfDay: null });

    const { params } = habitLogsUpdate(query);
    expect(params[8]).toBe(true);
    expect(params[9]).toBeNull();
  });

  it('keeps notes, story, difficulty and archived on COALESCE, where null means "not sent"', async () => {
    const query = mockPool();

    await habitService.updateHabitFollowUp(String(LOG_ID), USER_ID, { timeOfDay: '07:05' });

    const { sql } = habitLogsUpdate(query);
    expect(sql).toContain('notes = COALESCE($3, notes)');
    expect(sql).toContain('story = COALESCE($4, story)');
    expect(sql).toContain('archived = COALESCE($7, archived)');
    expect(sql).toContain('difficulty = COALESCE($8, difficulty)');
  });

  it('maps the column back as HH:mm, without the seconds Postgres adds', async () => {
    mockPool();

    const followUp = await habitService.updateHabitFollowUp(String(LOG_ID), USER_ID, {
      timeOfDay: '22:15',
    });

    expect(followUp.timeOfDay).toBe('22:15');
  });
});

describe('habitFollowUpAdd: la misma regla al fusionar el día', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stamps the clock time on the merged row when it is sent', async () => {
    dayHasLog = true;
    const query = mockPool();

    await habitService.addHabitLog(String(HABIT_ID), USER_ID, {
      completedDate: '2026-09-24',
      timeOfDay: '07:05',
    });

    const { sql, params } = habitLogsUpdate(query);
    expect(sql).toContain('time_of_day = CASE WHEN $9::boolean THEN $10::time ELSE time_of_day END');
    expect(params[8]).toBe(true);
    expect(params[9]).toBe('07:05');
  });

  it('leaves the time of the earlier touch alone when the field does not travel', async () => {
    dayHasLog = true;
    const query = mockPool();

    await habitService.addHabitLog(String(HABIT_ID), USER_ID, { completedDate: '2026-09-24' });

    const { params } = habitLogsUpdate(query);
    expect(params[8]).toBe(false);
    expect(params[9]).toBeNull();
  });

  it('clears the time of the merged row when it travels empty', async () => {
    dayHasLog = true;
    const query = mockPool();

    await habitService.addHabitLog(String(HABIT_ID), USER_ID, {
      completedDate: '2026-09-24',
      timeOfDay: null,
    });

    const { params } = habitLogsUpdate(query);
    expect(params[8]).toBe(true);
    expect(params[9]).toBeNull();
  });

  it('writes the time on the first follow-up of the day', async () => {
    dayHasLog = false;
    const query = mockPool();

    await habitService.addHabitLog(String(HABIT_ID), USER_ID, {
      completedDate: '2026-09-24',
      timeOfDay: '07:05',
    });

    const { sql, params } = habitLogsInsert(query);
    expect(sql).toContain('time_of_day');
    expect(params[11]).toBe('07:05');
  });

  it('writes no time at all when none is sent: null is "no time", not midnight', async () => {
    dayHasLog = false;
    const query = mockPool();

    await habitService.addHabitLog(String(HABIT_ID), USER_ID, { completedDate: '2026-09-24' });

    const { params } = habitLogsInsert(query);
    expect(params[11]).toBeNull();
  });
});
