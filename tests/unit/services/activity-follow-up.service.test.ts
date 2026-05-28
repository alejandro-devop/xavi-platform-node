import { ForbiddenError } from '../../../src/shared/errors';
import { activityFollowUpService } from '../../../src/services/activity-follow-up.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({
  getDbPool: jest.fn(),
}));

import { getDbPool } from '../../../src/shared/database/pool';

const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const USER_ID = 1;
const ACTIVITY_ID = 7;
const FOLLOW_UP_ID = 3;

function createFollowUpRow(overrides: Record<string, unknown> = {}) {
  const now = new Date('2024-06-01T12:00:00Z');
  return {
    id: FOLLOW_UP_ID,
    user_id: USER_ID,
    activity_id: ACTIVITY_ID,
    date: '2024-06-01',
    start_time: '09:00:00',
    duration_minutes: 60,
    notes: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('ActivityFollowUpService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  it('returns follow-up with computed end time', async () => {
    mockDbPool.query.mockResolvedValueOnce({ rows: [createFollowUpRow()] });

    const followUp = await activityFollowUpService.getFollowUpById(String(FOLLOW_UP_ID), USER_ID);

    expect(followUp.startTime).toBe('09:00:00');
    expect(followUp.durationMinutes).toBe(60);
    expect(followUp.endTime).toBe('10:00:00');
    expect(followUp.endDate).toBe('2024-06-01');
  });

  it('throws ForbiddenError for non-owner', async () => {
    mockDbPool.query.mockResolvedValueOnce({
      rows: [createFollowUpRow({ user_id: 2 })],
    });

    await expect(
      activityFollowUpService.getFollowUpById(String(FOLLOW_UP_ID), USER_ID)
    ).rejects.toThrow(ForbiddenError);
  });
});
