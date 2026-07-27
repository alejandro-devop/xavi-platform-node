import { BadRequestError, NotFoundError } from '../../../src/shared/errors';
import { workoutService } from '../../../src/services/workout.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

jest.mock('../../../src/shared/database/uuid', () => {
  const actual = jest.requireActual<typeof import('../../../src/shared/database/uuid')>(
    '../../../src/shared/database/uuid'
  );
  let counter = 0;
  return {
    ...actual,
    generateUuidV7: jest.fn(() => {
      counter += 1;
      return `018f0000-0000-7000-8000-${String(counter).padStart(12, '0')}`;
    }),
  };
});

jest.mock('../../../src/services/activity-follow-up.service', () => ({
  activityFollowUpService: {
    parseFollowUpId: jest.fn((id: string | number) =>
      typeof id === 'number' ? id : parseInt(id, 10)
    ),
    getFollowUpById: jest.fn(),
  },
}));

import { getDbPool } from '../../../src/shared/database/pool';
import { activityFollowUpService } from '../../../src/services/activity-follow-up.service';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;
const mockGetFollowUpById = activityFollowUpService.getFollowUpById as jest.MockedFunction<
  typeof activityFollowUpService.getFollowUpById
>;

const USER_ID = 1;
const ACTIVITY_ID = 7;
const FOLLOW_UP_ID = 42;
const EXERCISE_ID = '018f0000-0000-7000-8000-000000000001';
const SESSION_ID = '018f0000-0000-7000-8000-000000000010';
const SESSION_EXERCISE_ID = '018f0000-0000-7000-8000-000000000020';
const SET_ID = '018f0000-0000-7000-8000-000000000030';

function createExerciseRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-17T12:00:00Z');
  return {
    id: EXERCISE_ID,
    user_id: USER_ID,
    name: 'Bench press',
    body_region: 'upper',
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function createSessionRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-17T12:00:00Z');
  return {
    id: SESSION_ID,
    user_id: USER_ID,
    activity_follow_up_id: FOLLOW_UP_ID,
    activity_id: ACTIVITY_ID,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function createSessionExerciseRow(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_EXERCISE_ID,
    session_id: SESSION_ID,
    exercise_id: EXERCISE_ID,
    order_index: 0,
    created_at: new Date('2026-07-17T12:00:00Z'),
    ...overrides,
  };
}

function createSetRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-17T12:00:00Z');
  return {
    id: SET_ID,
    session_exercise_id: SESSION_EXERCISE_ID,
    set_index: 1,
    weight_kg: '60.00',
    reps: 8,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('WorkoutService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
    mockGetFollowUpById.mockReset();
  });

  describe('createExercise', () => {
    it('inserts an exercise', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createExerciseRow()] });

      const exercise = await workoutService.createExercise(USER_ID, {
        name: 'Bench press',
        bodyRegion: 'upper',
      });

      expect(exercise.name).toBe('Bench press');
      expect(exercise.bodyRegion).toBe('upper');
      expect(mockDbPool.query.mock.calls[0][0]).toContain('INSERT INTO exercises');
    });

    it('maps unique violation to BadRequestError', async () => {
      mockDbPool.query.mockRejectedValueOnce({ code: '23505' });

      await expect(
        workoutService.createExercise(USER_ID, { name: 'Bench press', bodyRegion: 'upper' })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('deleteExercise', () => {
    it('rejects when used in session history', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createExerciseRow()] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      await expect(workoutService.deleteExercise(USER_ID, EXERCISE_ID)).rejects.toThrow(
        BadRequestError
      );
    });

    it('deletes when unused', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createExerciseRow()] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(workoutService.deleteExercise(USER_ID, EXERCISE_ID)).resolves.toBe(true);
    });
  });

  describe('setActivityWorkoutExercises', () => {
    it('rejects foreign exercises', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID, is_workout: true }] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        workoutService.setActivityWorkoutExercises(USER_ID, String(ACTIVITY_ID), [EXERCISE_ID])
      ).rejects.toThrow(BadRequestError);
    });

    it('replaces the template associations', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID, is_workout: true }] })
        .mockResolvedValueOnce({ rows: [{ id: EXERCISE_ID }] })
        .mockResolvedValueOnce({ rows: [] }) // DELETE
        .mockResolvedValueOnce({ rows: [] }) // INSERT
        .mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID }] }) // ownership in list
        .mockResolvedValueOnce({ rows: [createExerciseRow()] });

      const exercises = await workoutService.setActivityWorkoutExercises(
        USER_ID,
        String(ACTIVITY_ID),
        [EXERCISE_ID]
      );

      expect(exercises).toHaveLength(1);
      expect(mockDbPool.query.mock.calls[2][0]).toContain('DELETE FROM activity_workout_exercises');
      expect(mockDbPool.query.mock.calls[3][0]).toContain('INSERT INTO activity_workout_exercises');
    });
  });

  describe('startWorkoutSession', () => {
    it('creates session and session exercises for an open workout follow-up', async () => {
      mockGetFollowUpById.mockResolvedValueOnce({
        id: String(FOLLOW_UP_ID),
        activityId: String(ACTIVITY_ID),
        userId: USER_ID,
        date: '2026-07-17',
        startTime: '10:00',
        durationMinutes: null,
        isOpen: true,
        endTime: null,
        endDate: null,
        endDateTime: null,
        notes: null,
        linkedTodoId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing session
        .mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID, is_workout: true }] })
        .mockResolvedValueOnce({ rows: [{ id: EXERCISE_ID }] })
        .mockResolvedValueOnce({ rows: [createSessionRow()] })
        .mockResolvedValueOnce({ rows: [] }) // insert session exercise
        .mockResolvedValueOnce({ rows: [createSessionExerciseRow()] });

      const session = await workoutService.startWorkoutSession(USER_ID, {
        followUpId: String(FOLLOW_UP_ID),
        exerciseIds: [EXERCISE_ID],
      });

      expect(session.followUpId).toBe(String(FOLLOW_UP_ID));
      expect(session.sessionExercises).toHaveLength(1);
      expect(mockDbPool.query.mock.calls[3][0]).toContain('INSERT INTO workout_sessions');
    });

    it('rejects when follow-up is closed', async () => {
      mockGetFollowUpById.mockResolvedValueOnce({
        id: String(FOLLOW_UP_ID),
        activityId: String(ACTIVITY_ID),
        userId: USER_ID,
        date: '2026-07-17',
        startTime: '10:00',
        durationMinutes: 45,
        isOpen: false,
        endTime: '10:45',
        endDate: '2026-07-17',
        endDateTime: '2026-07-17T10:45:00',
        notes: null,
        linkedTodoId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        workoutService.startWorkoutSession(USER_ID, {
          followUpId: String(FOLLOW_UP_ID),
          exerciseIds: [EXERCISE_ID],
        })
      ).rejects.toThrow(BadRequestError);
    });

    it('rejects when activity is not a workout', async () => {
      mockGetFollowUpById.mockResolvedValueOnce({
        id: String(FOLLOW_UP_ID),
        activityId: String(ACTIVITY_ID),
        userId: USER_ID,
        date: '2026-07-17',
        startTime: '10:00',
        durationMinutes: null,
        isOpen: true,
        endTime: null,
        endDate: null,
        endDateTime: null,
        notes: null,
        linkedTodoId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: ACTIVITY_ID, is_workout: false }] });

      await expect(
        workoutService.startWorkoutSession(USER_ID, {
          followUpId: String(FOLLOW_UP_ID),
          exerciseIds: [EXERCISE_ID],
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('upsertSet', () => {
    it('creates a set while follow-up is open', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({
          rows: [{ ...createSessionExerciseRow(), follow_up_id: FOLLOW_UP_ID }],
        })
        .mockResolvedValueOnce({ rows: [] }) // no existing by index
        .mockResolvedValueOnce({ rows: [createSetRow()] });

      mockGetFollowUpById.mockResolvedValueOnce({
        id: String(FOLLOW_UP_ID),
        activityId: String(ACTIVITY_ID),
        userId: USER_ID,
        date: '2026-07-17',
        startTime: '10:00',
        durationMinutes: null,
        isOpen: true,
        endTime: null,
        endDate: null,
        endDateTime: null,
        notes: null,
        linkedTodoId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const set = await workoutService.upsertSet(USER_ID, {
        sessionExerciseId: SESSION_EXERCISE_ID,
        setIndex: 1,
        weightKg: 60,
        reps: 8,
      });

      expect(set.weightKg).toBe(60);
      expect(set.reps).toBe(8);
      expect(set.setIndex).toBe(1);
    });

    it('rejects when follow-up is closed', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [{ ...createSessionExerciseRow(), follow_up_id: FOLLOW_UP_ID }],
      });

      mockGetFollowUpById.mockResolvedValueOnce({
        id: String(FOLLOW_UP_ID),
        activityId: String(ACTIVITY_ID),
        userId: USER_ID,
        date: '2026-07-17',
        startTime: '10:00',
        durationMinutes: 45,
        isOpen: false,
        endTime: '10:45',
        endDate: '2026-07-17',
        endDateTime: '2026-07-17T10:45:00',
        notes: null,
        linkedTodoId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        workoutService.upsertSet(USER_ID, {
          sessionExerciseId: SESSION_EXERCISE_ID,
          setIndex: 1,
          weightKg: 60,
          reps: 8,
        })
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('deleteSet', () => {
    it('throws when set is missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(workoutService.deleteSet(USER_ID, SET_ID)).rejects.toThrow(NotFoundError);
    });
  });

  describe('getSessionByFollowUpId', () => {
    it('returns null when missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        workoutService.getSessionByFollowUpId(USER_ID, String(FOLLOW_UP_ID))
      ).resolves.toBeNull();
    });
  });

  describe('getExerciseHistory', () => {
    it('returns PR as max weightKg and recent sets', async () => {
      const now = new Date('2026-07-17T12:00:00Z');
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createExerciseRow()] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: SET_ID,
              set_index: 2,
              weight_kg: '100.00',
              reps: 3,
              created_at: now,
              session_id: SESSION_ID,
              session_created_at: now,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              id: SET_ID,
              set_index: 2,
              weight_kg: '100.00',
              reps: 3,
              created_at: now,
              session_id: SESSION_ID,
              session_created_at: now,
            },
            {
              id: '018f0000-0000-7000-8000-000000000031',
              set_index: 1,
              weight_kg: '80.00',
              reps: 8,
              created_at: new Date('2026-07-16T12:00:00Z'),
              session_id: SESSION_ID,
              session_created_at: new Date('2026-07-16T12:00:00Z'),
            },
          ],
        });

      const history = await workoutService.getExerciseHistory(USER_ID, EXERCISE_ID);

      expect(history.exercise.name).toBe('Bench press');
      expect(history.personalRecord).toEqual({
        weightKg: 100,
        reps: 3,
        setId: SET_ID,
        achievedAt: now,
      });
      expect(history.recentSets).toHaveLength(2);
      expect(history.recentSets[0].weightKg).toBe(100);
      expect(mockDbPool.query.mock.calls[1][0]).toContain('ORDER BY ws.weight_kg DESC');
    });

    it('returns null PR when there are no sets', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createExerciseRow()] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const history = await workoutService.getExerciseHistory(USER_ID, EXERCISE_ID, 10);

      expect(history.personalRecord).toBeNull();
      expect(history.recentSets).toEqual([]);
    });

    it('throws when exercise is missing', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(workoutService.getExerciseHistory(USER_ID, EXERCISE_ID)).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe('getWorkoutReports', () => {
    const now = new Date('2026-07-17T15:00:00Z');

    it('aggregates frequency, volume and daily buckets for 7 days', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({
          rows: [{ session_count: 2, set_count: 3, volume_kg: 1440 }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              ...createExerciseRow(),
              session_count: 2,
              set_count: 3,
              volume_kg: 1440,
            },
            {
              ...createExerciseRow({
                id: '018f0000-0000-7000-8000-000000000002',
                name: 'Squat',
                body_region: 'lower',
              }),
              session_count: 1,
              set_count: 1,
              volume_kg: 400,
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              period_start: new Date('2026-07-17T00:00:00Z'),
              session_count: 1,
              set_count: 2,
              volume_kg: 960,
            },
            {
              period_start: new Date('2026-07-15T00:00:00Z'),
              session_count: 1,
              set_count: 1,
              volume_kg: 480,
            },
          ],
        });

      const reports = await workoutService.getWorkoutReports(USER_ID, 7, now);

      expect(reports.windowDays).toBe(7);
      expect(reports.sessionCount).toBe(2);
      expect(reports.totalSets).toBe(3);
      expect(reports.totalVolumeKg).toBe(1440);
      expect(reports.sessionsPerWeek).toBe(2);
      expect(reports.topExercises).toHaveLength(2);
      expect(reports.topExercises[0].exercise.name).toBe('Bench press');
      expect(reports.bottomExercises[0].exercise.name).toBe('Squat');
      expect(reports.volumeByPeriod).toHaveLength(7);
      expect(reports.volumeByPeriod[0].periodStart.toISOString()).toBe('2026-07-11T00:00:00.000Z');
      expect(reports.volumeByPeriod[4].volumeKg).toBe(480);
      expect(reports.volumeByPeriod[6].volumeKg).toBe(960);
      expect(mockDbPool.query.mock.calls[2][1]).toEqual([
        USER_ID,
        new Date('2026-07-11T00:00:00.000Z'),
        'day',
      ]);
    });

    it('returns empty rankings and zeroed weekly buckets when no data', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const reports = await workoutService.getWorkoutReports(USER_ID, 30, now);

      expect(reports.sessionCount).toBe(0);
      expect(reports.totalVolumeKg).toBe(0);
      expect(reports.sessionsPerWeek).toBe(0);
      expect(reports.topExercises).toEqual([]);
      expect(reports.bottomExercises).toEqual([]);
      expect(reports.volumeByPeriod.length).toBeGreaterThan(0);
      expect(reports.volumeByPeriod.every((b) => b.volumeKg === 0)).toBe(true);
      expect(mockDbPool.query.mock.calls[2][1][2]).toBe('week');
    });

    it('rejects invalid windowDays', async () => {
      await expect(
        workoutService.getWorkoutReports(USER_ID, 14 as 7 | 30 | 90, now)
      ).rejects.toThrow(BadRequestError);
    });
  });
});
