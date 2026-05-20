import { BadRequestError, ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { learningService } from '../../../src/services/learning.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const RESOURCE_ID = 12;
const SESSION_ID = 4;

function createResourceRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: RESOURCE_ID,
    user_id: USER_ID,
    title: 'TypeScript Handbook',
    description: null,
    resource_type: 'book',
    url: null,
    category: 'dev',
    priority: 'high',
    status: 'not_started',
    estimated_duration_minutes: 600,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function createProgressRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-02T10:00:00Z');
  return {
    id: SESSION_ID,
    resource_id: RESOURCE_ID,
    session_date: now,
    duration_minutes: 45,
    notes: null,
    progress_percentage: 25,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('LearningService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  describe('createLearningResource', () => {
    it('creates resource with default stats', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createResourceRow()] });

      const resource = await learningService.createLearningResource(USER_ID, {
        title: 'TypeScript Handbook',
        resourceType: 'book',
      });

      expect(resource.id).toBe(String(RESOURCE_ID));
      expect(resource.progressStats).toEqual({
        totalSessions: 0,
        totalTimeSpent: 0,
        currentProgress: 0,
      });
    });
  });

  describe('getLearningResourceById', () => {
    it('returns resource with sessions and stats', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createResourceRow()] })
        .mockResolvedValueOnce({ rows: [createProgressRow()] })
        .mockResolvedValueOnce({
          rows: [{ total_sessions: '1', total_time_spent: '45', current_progress: '25' }],
        });

      const resource = await learningService.getLearningResourceById(String(RESOURCE_ID), USER_ID);

      expect(resource.progressSessions).toHaveLength(1);
      expect(resource.progressStats?.currentProgress).toBe(25);
    });

    it('throws ForbiddenError for non-owner', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [createResourceRow({ user_id: 2 })],
      });

      await expect(
        learningService.getLearningResourceById(String(RESOURCE_ID), USER_ID)
      ).rejects.toThrow(ForbiddenError);
    });
  });

  describe('listLearningResources', () => {
    it('returns paginated resources with progress stats', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              ...createResourceRow(),
              total_sessions: '2',
              total_time_spent: '90',
              current_progress: '50',
            },
          ],
        });

      const collection = await learningService.listLearningResources(USER_ID);

      expect(collection.resources[0].progressStats).toEqual({
        totalSessions: 2,
        totalTimeSpent: 90,
        currentProgress: 50,
      });
      expect(collection.total).toBe(1);
    });
  });

  describe('createProgressSession', () => {
    it('auto-updates resource status to in_progress', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createResourceRow()] })
        .mockResolvedValueOnce({ rows: [createProgressRow()] })
        .mockResolvedValueOnce({ rows: [] });

      const session = await learningService.createProgressSession(USER_ID, {
        resourceId: String(RESOURCE_ID),
        durationMinutes: 45,
        progressPercentage: 25,
      });

      expect(session.durationMinutes).toBe(45);
      expect(mockDbPool.query).toHaveBeenCalledWith(
        'UPDATE learning_resources SET status = $1 WHERE id = $2',
        ['in_progress', RESOURCE_ID]
      );
    });

    it('auto-updates resource status to completed at 100%', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createResourceRow({ status: 'in_progress' })] })
        .mockResolvedValueOnce({ rows: [createProgressRow({ progress_percentage: 100 })] })
        .mockResolvedValueOnce({ rows: [] });

      await learningService.createProgressSession(USER_ID, {
        resourceId: String(RESOURCE_ID),
        durationMinutes: 30,
        progressPercentage: 100,
      });

      expect(mockDbPool.query).toHaveBeenCalledWith(
        'UPDATE learning_resources SET status = $1 WHERE id = $2',
        ['completed', RESOURCE_ID]
      );
    });
  });

  describe('updateLearningResource', () => {
    it('throws BadRequestError when no fields', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [createResourceRow()] });

      await expect(
        learningService.updateLearningResource(String(RESOURCE_ID), USER_ID, {})
      ).rejects.toThrow(BadRequestError);
    });
  });

  describe('deleteProgressSession', () => {
    it('throws NotFoundError when session missing', async () => {
      mockDbPool.query
        .mockResolvedValueOnce({ rows: [createResourceRow()] })
        .mockResolvedValueOnce({ rows: [] });

      await expect(
        learningService.deleteProgressSession(String(RESOURCE_ID), String(SESSION_ID), USER_ID)
      ).rejects.toThrow(NotFoundError);
    });
  });
});
