import { getDbPool } from '../shared/database/pool';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../shared/errors';
import { CinnamonBond, BondStatus } from '../types/services/sweeter-way.types';

function mapBondRow(row: Record<string, unknown>): CinnamonBond {
  return {
    id: row.id as string,
    requesterId: row.requester_id as number,
    addresseeId: row.addressee_id as number,
    status: row.status as BondStatus,
    requestedAt: row.requested_at as Date,
    respondedAt: row.responded_at as Date | null,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

export const swBondService = {
  async getActiveBond(userId: number): Promise<CinnamonBond | null> {
    const db = getDbPool();
    const result = await db.query(
      `SELECT * FROM sw_cinnamon_bonds
       WHERE status = 'accepted'
         AND (requester_id = $1 OR addressee_id = $1)
       LIMIT 1`,
      [userId]
    );
    return result.rows.length > 0 ? mapBondRow(result.rows[0]) : null;
  },

  async getBondById(bondId: string, userId: number): Promise<CinnamonBond> {
    const db = getDbPool();
    const result = await db.query('SELECT * FROM sw_cinnamon_bonds WHERE id = $1', [bondId]);
    if (result.rows.length === 0) throw new NotFoundError('Bond not found');
    const bond = mapBondRow(result.rows[0]);
    if (bond.requesterId !== userId && bond.addresseeId !== userId) {
      throw new ForbiddenError('You are not part of this bond');
    }
    return bond;
  },

  async sendCinnamonRequest(requesterId: number, addresseeId: number): Promise<CinnamonBond> {
    if (requesterId === addresseeId) {
      throw new BadRequestError('Cannot send a bond request to yourself');
    }

    const db = getDbPool();

    // Requester already has an active bond
    const activeBond = await this.getActiveBond(requesterId);
    if (activeBond) throw new ConflictError('You already have an active cinnamon bond');

    // Pending request already exists between these two users
    const existingRequest = await db.query(
      `SELECT id FROM sw_cinnamon_bonds
       WHERE status = 'pending'
         AND ((requester_id = $1 AND addressee_id = $2) OR (requester_id = $2 AND addressee_id = $1))`,
      [requesterId, addresseeId]
    );
    if (existingRequest.rows.length > 0) {
      throw new ConflictError('A pending bond request already exists between these users');
    }

    const result = await db.query(
      `INSERT INTO sw_cinnamon_bonds (requester_id, addressee_id)
       VALUES ($1, $2)
       RETURNING *`,
      [requesterId, addresseeId]
    );
    return mapBondRow(result.rows[0]);
  },

  async respondCinnamonRequest(
    bondId: string,
    userId: number,
    accept: boolean
  ): Promise<CinnamonBond> {
    const db = getDbPool();
    const result = await db.query('SELECT * FROM sw_cinnamon_bonds WHERE id = $1', [bondId]);
    if (result.rows.length === 0) throw new NotFoundError('Bond request not found');

    const bond = mapBondRow(result.rows[0]);

    if (bond.addresseeId !== userId) {
      throw new ForbiddenError('Only the addressee can respond to a bond request');
    }
    if (bond.status !== 'pending') {
      throw new BadRequestError(`Bond request is already ${bond.status}`);
    }

    if (accept) {
      // Ensure neither user already has an accepted bond
      const requesterBond = await this.getActiveBond(bond.requesterId);
      if (requesterBond) throw new ConflictError('Requester already has an active bond');

      const addresseeBond = await this.getActiveBond(userId);
      if (addresseeBond) throw new ConflictError('You already have an active bond');
    }

    const newStatus = accept ? 'accepted' : 'rejected';
    const updated = await db.query(
      `UPDATE sw_cinnamon_bonds
       SET status = $1, responded_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [newStatus, bondId]
    );
    return mapBondRow(updated.rows[0]);
  },

  async dissolveBond(bondId: string, userId: number): Promise<boolean> {
    const db = getDbPool();
    const result = await db.query('SELECT * FROM sw_cinnamon_bonds WHERE id = $1', [bondId]);
    if (result.rows.length === 0) throw new NotFoundError('Bond not found');

    const bond = mapBondRow(result.rows[0]);
    if (bond.requesterId !== userId && bond.addresseeId !== userId) {
      throw new ForbiddenError('You are not part of this bond');
    }
    if (bond.status !== 'accepted') {
      throw new BadRequestError('Only an accepted bond can be dissolved');
    }

    await db.query(
      `UPDATE sw_cinnamon_bonds
       SET status = 'dissolved', responded_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [bondId]
    );
    return true;
  },

  /** Returns the partner's userId for a given accepted bond. */
  getCinnamonId(bond: CinnamonBond, myUserId: number): number {
    return bond.requesterId === myUserId ? bond.addresseeId : bond.requesterId;
  },
};
