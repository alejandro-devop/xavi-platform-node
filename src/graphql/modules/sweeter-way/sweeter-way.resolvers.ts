import { requireAuth } from '../../utils/error-handler';
import { withValidatedResolver } from '../../utils/validation';
import { swBondService } from '../../../services/sweeter-way-bond.service';
import { swListService } from '../../../services/sweeter-way-list.service';
import { swNotificationService } from '../../../services/sweeter-way-notification.service';
import { swEmailService } from '../../../services/sweeter-way-email.service';
import { logger } from '../../../shared/logger';
import { getDbPool } from '../../../shared/database/pool';
import {
  swSendCinnamonRequestSchema,
  swRespondCinnamonRequestSchema,
  swDissolveBondSchema,
  swCreateListSchema,
  swUpdateListSchema,
  swDeleteListSchema,
  swListItemsSchema,
  swAddListItemSchema,
  swUpdateListItemSchema,
  swCompleteListItemSchema,
  swRateListItemSchema,
  swItemLogSchema,
  swUpsertItemLogSchema,
  swMyNotificationsSchema,
  swMarkNotificationsReadSchema,
  swUpdatePreferencesSchema,
} from '../../../validators/schemas/sweeter-way.schemas';
import { CinnamonBond, SWNotification } from '../../../types/services/sweeter-way.types';
import { z } from 'zod';

function uid(context: { user?: { id: string | number } | null }): number {
  return Number(context.user!.id);
}

async function getUserInfo(userId: number): Promise<{ email: string; name: string }> {
  const db = getDbPool();
  const result = await db.query('SELECT email, name FROM users WHERE id = $1', [userId]);
  const row = result.rows[0];
  return { email: row?.email ?? '', name: row?.name ?? 'Someone' };
}

async function safeDispatchBondSideEffects(
  bond: CinnamonBond,
  type: 'bond_requested' | 'bond_accepted' | 'bond_rejected'
) {
  try {
    const actorId =
      type === 'bond_requested' ? bond.requesterId : bond.addresseeId;
    const recipientId =
      type === 'bond_requested' ? bond.addresseeId : bond.requesterId;

    const prefs = await swNotificationService._getOrCreatePreferences(recipientId);
    if (prefs.inAppNotifications) {
      await swNotificationService.createNotification({
        recipientId,
        actorId,
        type,
        entityType: 'bond',
        entityId: bond.id,
      });
    }

    if (prefs.emailNotifications) {
      const actor = await getUserInfo(actorId);
      const recipient = await getUserInfo(recipientId);
      if (type === 'bond_requested') {
        await swEmailService.sendBondRequested(actor.name, recipient.email, recipient.name);
      } else if (type === 'bond_accepted') {
        await swEmailService.sendBondAccepted(actor.name, recipient.email, recipient.name);
      } else {
        await swEmailService.sendBondRejected(actor.name, recipient.email, recipient.name);
      }
    }
  } catch (err) {
    logger.error({ err, bondId: bond.id, type }, '[sweeter-way] Side effect dispatch failed');
  }
}

async function safeDispatchItemSideEffects(
  actorId: number,
  bondId: string,
  itemId: string,
  itemTitle: string,
  listTitle: string,
  type: 'item_added' | 'item_completed'
) {
  try {
    const db = getDbPool();
    const bondResult = await db.query(
      'SELECT requester_id, addressee_id FROM sw_cinnamon_bonds WHERE id = $1',
      [bondId]
    );
    if (bondResult.rows.length === 0) return;

    const bond = bondResult.rows[0];
    const recipientId = bond.requester_id === actorId ? bond.addressee_id : bond.requester_id;

    const prefs = await swNotificationService._getOrCreatePreferences(recipientId);
    if (prefs.inAppNotifications) {
      await swNotificationService.createNotification({
        recipientId,
        actorId,
        type,
        entityType: 'item',
        entityId: itemId,
        payload: { itemTitle, listTitle },
      });
    }

    if (prefs.emailNotifications) {
      const actor = await getUserInfo(actorId);
      const cinnamon = await getUserInfo(recipientId);
      if (type === 'item_added') {
        await swEmailService.sendItemAdded(actor.name, cinnamon.email, cinnamon.name, itemTitle, listTitle);
      } else {
        await swEmailService.sendItemCompleted(actor.name, cinnamon.email, cinnamon.name, itemTitle, listTitle);
      }
    }
  } catch (err) {
    logger.error({ err, itemId, type }, '[sweeter-way] Item side effect dispatch failed');
  }
}

async function safeDispatchLogSideEffects(
  actorId: number,
  bondId: string,
  itemId: string,
  itemTitle: string
) {
  try {
    const db = getDbPool();
    const bondResult = await db.query(
      'SELECT requester_id, addressee_id FROM sw_cinnamon_bonds WHERE id = $1',
      [bondId]
    );
    if (bondResult.rows.length === 0) return;

    const bond = bondResult.rows[0];
    const recipientId = bond.requester_id === actorId ? bond.addressee_id : bond.requester_id;

    const prefs = await swNotificationService._getOrCreatePreferences(recipientId);
    if (prefs.inAppNotifications) {
      await swNotificationService.createNotification({
        recipientId,
        actorId,
        type: 'log_added',
        entityType: 'log',
        entityId: itemId,
        payload: { itemTitle },
      });
    }

    if (prefs.emailNotifications) {
      const actor = await getUserInfo(actorId);
      const cinnamon = await getUserInfo(recipientId);
      await swEmailService.sendLogAdded(actor.name, cinnamon.email, cinnamon.name, itemTitle);
    }
  } catch (err) {
    logger.error({ err, itemId }, '[sweeter-way] Log side effect dispatch failed');
  }
}

const emptySchema = z.object({});

export const sweeterWayResolvers = {
  Query: {
    swMyBond: withValidatedResolver(
      emptySchema,
      async (_: unknown, __: unknown, context) => {
        requireAuth(context, 'swMyBond');
        return swBondService.getActiveBond(uid(context));
      },
      'swMyBond'
    ),

    swMyPendingBondRequests: withValidatedResolver(
      emptySchema,
      async (_: unknown, __: unknown, context) => {
        requireAuth(context, 'swMyPendingBondRequests');
        return swBondService.getMyPendingBondRequests(uid(context));
      },
      'swMyPendingBondRequests'
    ),

    swMyLists: withValidatedResolver(
      emptySchema,
      async (_: unknown, __: unknown, context) => {
        requireAuth(context, 'swMyLists');
        return swListService.getMyLists(uid(context));
      },
      'swMyLists'
    ),

    swListItems: withValidatedResolver(
      swListItemsSchema,
      async (_: unknown, { listId }: { listId: string }, context) => {
        requireAuth(context, 'swListItems');
        return swListService.getListItems(listId, uid(context));
      },
      'swListItems'
    ),

    swItemLogs: withValidatedResolver(
      swItemLogSchema,
      async (_: unknown, { itemId }: { itemId: string }, context) => {
        requireAuth(context, 'swItemLogs');
        return swListService.getItemLogs(itemId, uid(context));
      },
      'swItemLogs'
    ),

    swMyNotifications: withValidatedResolver(
      swMyNotificationsSchema,
      async (_: unknown, { unreadOnly }: { unreadOnly?: boolean }, context) => {
        requireAuth(context, 'swMyNotifications');
        return swNotificationService.getMyNotifications(uid(context), unreadOnly);
      },
      'swMyNotifications'
    ),

    swMyPreferences: withValidatedResolver(
      emptySchema,
      async (_: unknown, __: unknown, context) => {
        requireAuth(context, 'swMyPreferences');
        return swNotificationService.getMyPreferences(uid(context));
      },
      'swMyPreferences'
    ),
  },

  Mutation: {
    swSendCinnamonRequest: withValidatedResolver(
      swSendCinnamonRequestSchema,
      async (_: unknown, { addresseeEmail }: { addresseeEmail: string }, context) => {
        requireAuth(context, 'swSendCinnamonRequest');
        const bond = await swBondService.sendCinnamonRequestByEmail(uid(context), addresseeEmail);
        void safeDispatchBondSideEffects(bond, 'bond_requested');
        return bond;
      },
      'swSendCinnamonRequest'
    ),

    swRespondCinnamonRequest: withValidatedResolver(
      swRespondCinnamonRequestSchema,
      async (_: unknown, { bondId, accept }: { bondId: string; accept: boolean }, context) => {
        requireAuth(context, 'swRespondCinnamonRequest');
        const bond = await swBondService.respondCinnamonRequest(bondId, uid(context), accept);
        void safeDispatchBondSideEffects(bond, accept ? 'bond_accepted' : 'bond_rejected');
        return bond;
      },
      'swRespondCinnamonRequest'
    ),

    swDissolveBond: withValidatedResolver(
      swDissolveBondSchema,
      async (_: unknown, { bondId }: { bondId: string }, context) => {
        requireAuth(context, 'swDissolveBond');
        return swBondService.dissolveBond(bondId, uid(context));
      },
      'swDissolveBond'
    ),

    swCreateList: withValidatedResolver(
      swCreateListSchema,
      async (_: unknown, { input }: { input: { title: string; description?: string | null; category: string } }, context) => {
        requireAuth(context, 'swCreateList');
        return swListService.createList(uid(context), input as never);
      },
      'swCreateList'
    ),

    swUpdateList: withValidatedResolver(
      swUpdateListSchema,
      async (_: unknown, { id, input }: { id: string; input: Record<string, unknown> }, context) => {
        requireAuth(context, 'swUpdateList');
        return swListService.updateList(id, uid(context), input as never);
      },
      'swUpdateList'
    ),

    swDeleteList: withValidatedResolver(
      swDeleteListSchema,
      async (_: unknown, { id }: { id: string }, context) => {
        requireAuth(context, 'swDeleteList');
        return swListService.deleteList(id, uid(context));
      },
      'swDeleteList'
    ),

    swAddListItem: withValidatedResolver(
      swAddListItemSchema,
      async (_: unknown, { listId, input }: { listId: string; input: Record<string, unknown> }, context) => {
        requireAuth(context, 'swAddListItem');
        const item = await swListService.addListItem(listId, uid(context), input as never);

        // fetch list title for notification payload
        const db = getDbPool();
        const listResult = await db.query('SELECT title, bond_id FROM sw_lists WHERE id = $1', [listId]);
        const listTitle = listResult.rows[0]?.title ?? '';
        const bondId = listResult.rows[0]?.bond_id ?? '';

        void safeDispatchItemSideEffects(uid(context), bondId, item.id, item.title, listTitle, 'item_added');
        return item;
      },
      'swAddListItem'
    ),

    swUpdateListItem: withValidatedResolver(
      swUpdateListItemSchema,
      async (_: unknown, { id, input }: { id: string; input: Record<string, unknown> }, context) => {
        requireAuth(context, 'swUpdateListItem');
        return swListService.updateListItem(id, uid(context), input as never);
      },
      'swUpdateListItem'
    ),

    swCompleteListItem: withValidatedResolver(
      swCompleteListItemSchema,
      async (_: unknown, { id }: { id: string }, context) => {
        requireAuth(context, 'swCompleteListItem');
        const item = await swListService.completeListItem(id, uid(context));

        const listId = await swListService.getItemListId(id);
        const db = getDbPool();
        const listResult = await db.query('SELECT title, bond_id FROM sw_lists WHERE id = $1', [listId]);
        const listTitle = listResult.rows[0]?.title ?? '';
        const bondId = listResult.rows[0]?.bond_id ?? '';

        void safeDispatchItemSideEffects(uid(context), bondId, item.id, item.title, listTitle, 'item_completed');
        return item;
      },
      'swCompleteListItem'
    ),

    swRateListItem: withValidatedResolver(
      swRateListItemSchema,
      async (_: unknown, { id, rating, wouldReturn }: { id: string; rating: number; wouldReturn: boolean }, context) => {
        requireAuth(context, 'swRateListItem');
        return swListService.rateListItem(id, uid(context), rating, wouldReturn);
      },
      'swRateListItem'
    ),

    swUpsertItemLog: withValidatedResolver(
      swUpsertItemLogSchema,
      async (_: unknown, { itemId, input }: { itemId: string; input: Record<string, unknown> }, context) => {
        requireAuth(context, 'swUpsertItemLog');
        const log = await swListService.upsertItemLog(itemId, uid(context), input as never);

        const listId = await swListService.getItemListId(itemId);
        const db = getDbPool();
        const itemResult = await db.query('SELECT title FROM sw_list_items WHERE id = $1', [itemId]);
        const listResult = await db.query('SELECT bond_id FROM sw_lists WHERE id = $1', [listId]);
        const itemTitle = itemResult.rows[0]?.title ?? '';
        const bondId = listResult.rows[0]?.bond_id ?? '';

        void safeDispatchLogSideEffects(uid(context), bondId, itemId, itemTitle);
        return log;
      },
      'swUpsertItemLog'
    ),

    swMarkNotificationsRead: withValidatedResolver(
      swMarkNotificationsReadSchema,
      async (_: unknown, { ids }: { ids: string[] }, context) => {
        requireAuth(context, 'swMarkNotificationsRead');
        return swNotificationService.markNotificationsRead(ids, uid(context));
      },
      'swMarkNotificationsRead'
    ),

    swUpdatePreferences: withValidatedResolver(
      swUpdatePreferencesSchema,
      async (_: unknown, { input }: { input: Record<string, unknown> }, context) => {
        requireAuth(context, 'swUpdatePreferences');
        return swNotificationService.updatePreferences(uid(context), input as never);
      },
      'swUpdatePreferences'
    ),
  },

  SWNotification: {
    payload: (parent: SWNotification) =>
      parent.payload ? JSON.stringify(parent.payload) : null,
  },
};
