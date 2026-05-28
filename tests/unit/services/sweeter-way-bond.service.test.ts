import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../../src/shared/errors';
import { swBondService } from '../../../src/services/sweeter-way-bond.service';
import { mockDbPool, resetAllMocks } from '../../helpers/mocks';

jest.mock('../../../src/shared/database/pool', () => ({ getDbPool: jest.fn() }));
import { getDbPool } from '../../../src/shared/database/pool';
const mockGetDbPool = getDbPool as jest.MockedFunction<typeof getDbPool>;

const NOW = new Date('2025-01-01T12:00:00Z');
const BOND_ID = 'bond-uuid-0001';
const USER_A = 1;
const USER_B = 2;
const USER_C = 3;

function makeBondRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BOND_ID,
    requester_id: USER_A,
    addressee_id: USER_B,
    status: 'pending',
    requested_at: NOW,
    responded_at: null,
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

describe('swBondService', () => {
  beforeEach(() => {
    resetAllMocks();
    mockGetDbPool.mockReturnValue(mockDbPool as never);
  });

  // ─── getActiveBond ───────────────────────────────────────────────────────────

  describe('getActiveBond', () => {
    it('returns null when no accepted bond exists', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });
      const result = await swBondService.getActiveBond(USER_A);
      expect(result).toBeNull();
    });

    it('returns the accepted bond', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [makeBondRow({ status: 'accepted' })],
      });
      const bond = await swBondService.getActiveBond(USER_A);
      expect(bond?.status).toBe('accepted');
      expect(bond?.requesterId).toBe(USER_A);
    });
  });

  // ─── sendCinnamonRequest ─────────────────────────────────────────────────────

  describe('sendCinnamonRequest', () => {
    it('throws BadRequestError on self-request', async () => {
      await expect(swBondService.sendCinnamonRequest(USER_A, USER_A)).rejects.toThrow(
        BadRequestError
      );
    });

    it('throws ConflictError when requester already has an accepted bond', async () => {
      // getActiveBond returns a bond → requester already bonded
      mockDbPool.query.mockResolvedValueOnce({
        rows: [makeBondRow({ status: 'accepted' })],
      });
      await expect(swBondService.sendCinnamonRequest(USER_A, USER_B)).rejects.toThrow(
        ConflictError
      );
    });

    it('throws ConflictError when a pending request already exists between the two users', async () => {
      // getActiveBond → no active bond
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });
      // pending check → row found
      mockDbPool.query.mockResolvedValueOnce({ rows: [{ id: 'some-id' }] });
      await expect(swBondService.sendCinnamonRequest(USER_A, USER_B)).rejects.toThrow(
        ConflictError
      );
    });

    it('creates and returns a new bond request', async () => {
      const newBond = makeBondRow();
      // getActiveBond → none
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });
      // pending check → none
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });
      // INSERT
      mockDbPool.query.mockResolvedValueOnce({ rows: [newBond] });

      const bond = await swBondService.sendCinnamonRequest(USER_A, USER_B);
      expect(bond.status).toBe('pending');
      expect(bond.requesterId).toBe(USER_A);
      expect(bond.addresseeId).toBe(USER_B);
    });
  });

  // ─── respondCinnamonRequest ──────────────────────────────────────────────────

  describe('respondCinnamonRequest', () => {
    it('throws NotFoundError when bond does not exist', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });
      await expect(
        swBondService.respondCinnamonRequest(BOND_ID, USER_B, true)
      ).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when user is not the addressee', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeBondRow()] });
      // USER_C is not the addressee (USER_B is)
      await expect(
        swBondService.respondCinnamonRequest(BOND_ID, USER_C, true)
      ).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError when bond is not pending', async () => {
      mockDbPool.query.mockResolvedValueOnce({
        rows: [makeBondRow({ status: 'accepted' })],
      });
      await expect(
        swBondService.respondCinnamonRequest(BOND_ID, USER_B, true)
      ).rejects.toThrow(BadRequestError);
    });

    it('throws ConflictError when requester already has an accepted bond (on accept)', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeBondRow()] }); // bond lookup
      // getActiveBond for requester → found
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeBondRow({ status: 'accepted' })] });
      await expect(
        swBondService.respondCinnamonRequest(BOND_ID, USER_B, true)
      ).rejects.toThrow(ConflictError);
    });

    it('accepts the bond and returns updated record', async () => {
      const accepted = makeBondRow({ status: 'accepted', responded_at: NOW });
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeBondRow()] });   // bond lookup
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });                // getActiveBond requester
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });                // getActiveBond addressee
      mockDbPool.query.mockResolvedValueOnce({ rows: [accepted] });        // UPDATE

      const bond = await swBondService.respondCinnamonRequest(BOND_ID, USER_B, true);
      expect(bond.status).toBe('accepted');
    });

    it('rejects the bond and returns updated record', async () => {
      const rejected = makeBondRow({ status: 'rejected', responded_at: NOW });
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeBondRow()] });
      mockDbPool.query.mockResolvedValueOnce({ rows: [rejected] });

      const bond = await swBondService.respondCinnamonRequest(BOND_ID, USER_B, false);
      expect(bond.status).toBe('rejected');
    });
  });

  // ─── dissolveBond ────────────────────────────────────────────────────────────

  describe('dissolveBond', () => {
    it('throws NotFoundError when bond does not exist', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [] });
      await expect(swBondService.dissolveBond(BOND_ID, USER_A)).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when user is not part of the bond', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeBondRow({ status: 'accepted' })] });
      await expect(swBondService.dissolveBond(BOND_ID, USER_C)).rejects.toThrow(ForbiddenError);
    });

    it('throws BadRequestError when bond is not accepted', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeBondRow({ status: 'pending' })] });
      await expect(swBondService.dissolveBond(BOND_ID, USER_A)).rejects.toThrow(BadRequestError);
    });

    it('dissolves the bond and returns true', async () => {
      mockDbPool.query.mockResolvedValueOnce({ rows: [makeBondRow({ status: 'accepted' })] });
      mockDbPool.query.mockResolvedValueOnce({ rows: [] }); // UPDATE
      const result = await swBondService.dissolveBond(BOND_ID, USER_A);
      expect(result).toBe(true);
    });
  });

  // ─── getCinnamonId ───────────────────────────────────────────────────────────

  describe('getCinnamonId', () => {
    it('returns addresseeId when caller is the requester', () => {
      const bond = swBondService.getCinnamonId(
        { requesterId: USER_A, addresseeId: USER_B } as never,
        USER_A
      );
      expect(bond).toBe(USER_B);
    });

    it('returns requesterId when caller is the addressee', () => {
      const bond = swBondService.getCinnamonId(
        { requesterId: USER_A, addresseeId: USER_B } as never,
        USER_B
      );
      expect(bond).toBe(USER_A);
    });
  });
});
