import { getDbPool } from '../shared/database/pool';
import { generateUuidV7 } from '../shared/database/uuid';
import { BadRequestError, NotFoundError } from '../shared/errors';
import type {
  CarryOverStandupItemsInput,
  CreateStandupItemInput,
  CreateStandupMemberInput,
  StandupDay,
  StandupDayStatus,
  StandupDaySummary,
  StandupDayView,
  StandupItem,
  StandupItemStatus,
  StandupMember,
  StandupSummaryMemberGroup,
  StandupWeekEntry,
  UpdateStandupItemInput,
  UpdateStandupMemberInput,
} from '../types/services/standup.types';
import { todoFolderService } from './todo-folder.service';
import { todoService } from './todo.service';
import { userSettingsService } from './user-settings.service';

type MemberRow = {
  id: string;
  user_id: number;
  name: string;
  is_active: boolean;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

type DayRow = {
  id: string;
  user_id: number;
  date: Date | string;
  status: StandupDayStatus;
  opened_at: Date;
  closed_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type ItemRow = {
  id: string;
  user_id: number;
  day_id: string;
  member_id: string;
  title: string;
  notes: string | null;
  ticket_number: string | null;
  status: StandupItemStatus;
  blocked_reason: string | null;
  backlog_started_on: Date | string;
  source_item_id: string | null;
  linked_todo_id: number | null;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

const MEMBER_RETURNING = `id, user_id, name, is_active, order_index, created_at, updated_at`;
const DAY_RETURNING = `id, user_id, date, status, opened_at, closed_at, created_at, updated_at`;
const ITEM_RETURNING = `id, user_id, day_id, member_id, title, notes, ticket_number, status, blocked_reason, backlog_started_on, source_item_id, linked_todo_id, order_index, created_at, updated_at`;

const STATUS_LABELS: Record<StandupItemStatus, string> = {
  pending: 'pendiente',
  in_progress: 'en progreso',
  completed: 'completada',
  blocked: 'bloqueada',
};

function isWeekend(date: string): boolean {
  const [y, m, d] = date.split('-').map((part) => parseInt(part, 10));
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return day === 0 || day === 6;
}

export function formatDateForApi(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export function assertDateString(date: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BadRequestError('Invalid date format (use YYYY-MM-DD)');
  }
  const [y, m, d] = date.split('-').map((part) => parseInt(part, 10));
  const utc = new Date(Date.UTC(y, m - 1, d));
  if (
    utc.getUTCFullYear() !== y ||
    utc.getUTCMonth() !== m - 1 ||
    utc.getUTCDate() !== d
  ) {
    throw new BadRequestError('Invalid calendar date');
  }
  return date;
}

export function previousDateString(date: string): string {
  const [y, m, d] = assertDateString(date).split('-').map((part) => parseInt(part, 10));
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return utc.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const a = assertDateString(start);
  const b = assertDateString(end);
  const [ay, am, ad] = a.split('-').map((part) => parseInt(part, 10));
  const [by, bm, bd] = b.split('-').map((part) => parseInt(part, 10));
  const startMs = Date.UTC(ay, am - 1, ad);
  const endMs = Date.UTC(by, bm - 1, bd);
  return Math.max(0, Math.round((endMs - startMs) / 86_400_000));
}

function mapMember(row: MemberRow): StandupMember {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    isActive: row.is_active,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDay(row: DayRow): StandupDay {
  return {
    id: row.id,
    userId: row.user_id,
    date: formatDateForApi(row.date),
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItem(row: ItemRow, asOfDate: string): StandupItem {
  const backlogStartedOn = formatDateForApi(row.backlog_started_on);
  return {
    id: row.id,
    userId: row.user_id,
    dayId: row.day_id,
    memberId: row.member_id,
    title: row.title,
    notes: row.notes,
    ticketNumber: row.ticket_number,
    status: row.status,
    blockedReason: row.blocked_reason,
    backlogStartedOn,
    daysInBacklog: daysBetween(backlogStartedOn, asOfDate),
    sourceItemId: row.source_item_id,
    linkedTodoId: row.linked_todo_id != null ? String(row.linked_todo_id) : null,
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) throw new BadRequestError('Name is required');
  return trimmed;
}

async function getOwnedMemberOrThrow(userId: number, id: string): Promise<MemberRow> {
  const db = getDbPool();
  const result = await db.query<MemberRow>(
    `SELECT ${MEMBER_RETURNING} FROM standup_members WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Standup member not found');
  return result.rows[0];
}

async function getDayByDate(
  userId: number,
  date: string
): Promise<DayRow | null> {
  const db = getDbPool();
  const result = await db.query<DayRow>(
    `SELECT ${DAY_RETURNING} FROM standup_days WHERE user_id = $1 AND date = $2::date`,
    [userId, date]
  );
  return result.rows[0] ?? null;
}

async function getOwnedDayOrThrow(userId: number, date: string): Promise<DayRow> {
  const day = await getDayByDate(userId, date);
  if (!day) throw new NotFoundError('Standup day not found');
  return day;
}

async function getOwnedItemOrThrow(userId: number, id: string): Promise<ItemRow> {
  const db = getDbPool();
  const result = await db.query<ItemRow>(
    `SELECT ${ITEM_RETURNING} FROM standup_items WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  if (result.rows.length === 0) throw new NotFoundError('Standup item not found');
  return result.rows[0];
}

async function assertDayIsOpen(day: DayRow): Promise<void> {
  if (day.status !== 'open') {
    throw new BadRequestError('Standup day is closed');
  }
}

async function listItemsForDay(userId: number, day: DayRow): Promise<StandupItem[]> {
  const db = getDbPool();
  const date = formatDateForApi(day.date);
  const result = await db.query<ItemRow>(
    `SELECT ${ITEM_RETURNING}
     FROM standup_items
     WHERE user_id = $1 AND day_id = $2
     ORDER BY order_index ASC, created_at ASC`,
    [userId, day.id]
  );
  return result.rows.map((row) => mapItem(row, date));
}

async function listUnfinishedForDate(userId: number, date: string): Promise<StandupItem[]> {
  const day = await getDayByDate(userId, date);
  if (!day) return [];
  const items = await listItemsForDay(userId, day);
  return items.filter((item) => item.status !== 'completed');
}

async function nextItemOrderIndex(dayId: string): Promise<number> {
  const db = getDbPool();
  const result = await db.query<{ max: number | null }>(
    `SELECT MAX(order_index) AS max FROM standup_items WHERE day_id = $1`,
    [dayId]
  );
  return (result.rows[0]?.max ?? -1) + 1;
}

function formatItemLine(item: StandupItem): string {
  const ticket = item.ticketNumber ? ` (#${item.ticketNumber})` : '';
  const notes = item.notes?.trim() ? ` — ${item.notes.trim()}` : '';
  const backlog = item.daysInBacklog > 0 ? ` · ${item.daysInBacklog}d en backlog` : '';
  return `- ${item.title}${ticket} — ${STATUS_LABELS[item.status]}${backlog}${notes}`;
}

function buildSummaryText(groups: StandupSummaryMemberGroup[]): string {
  const allItems = groups.flatMap((g) => g.items);
  if (allItems.length === 0) return 'Sin entradas para este día.';

  const sections: string[] = [];

  const blockedByMember = groups
    .map((group) => ({
      memberName: group.memberName,
      items: group.items.filter((item) => item.status === 'blocked'),
    }))
    .filter((group) => group.items.length > 0);

  if (blockedByMember.length > 0) {
    const lines = blockedByMember.flatMap((group) =>
      group.items.map((item) => {
        const ticket = item.ticketNumber ? ` (#${item.ticketNumber})` : '';
        const reason = item.blockedReason?.trim() ? ` — ${item.blockedReason.trim()}` : '';
        return `- *${group.memberName}*: ${item.title}${ticket}${reason}`;
      })
    );
    sections.push(`🚧 *Bloqueadores*\n${lines.join('\n')}`);
  }

  for (const group of groups) {
    const rest = group.items.filter((item) => item.status !== 'blocked');
    if (rest.length === 0) continue;
    const lines = rest.map(formatItemLine);
    sections.push(`*${group.memberName}* está en:\n${lines.join('\n')}`);
  }

  return sections.join('\n\n');
}

export const standupService = {
  async listMembers(userId: number, includeInactive = false): Promise<StandupMember[]> {
    const db = getDbPool();
    const result = await db.query<MemberRow>(
      includeInactive
        ? `SELECT ${MEMBER_RETURNING} FROM standup_members WHERE user_id = $1 ORDER BY order_index ASC, name ASC`
        : `SELECT ${MEMBER_RETURNING} FROM standup_members WHERE user_id = $1 AND is_active = TRUE ORDER BY order_index ASC, name ASC`,
      [userId]
    );
    return result.rows.map(mapMember);
  },

  async createMember(userId: number, input: CreateStandupMemberInput): Promise<StandupMember> {
    const name = normalizeName(input.name);
    const db = getDbPool();
    const id = generateUuidV7();
    try {
      const result = await db.query<MemberRow>(
        `INSERT INTO standup_members (id, user_id, name, order_index)
         VALUES ($1, $2, $3, $4)
         RETURNING ${MEMBER_RETURNING}`,
        [id, userId, name, input.orderIndex ?? 0]
      );
      return mapMember(result.rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new BadRequestError('A standup member with that name already exists');
      }
      throw error;
    }
  },

  async updateMember(
    userId: number,
    id: string,
    input: UpdateStandupMemberInput
  ): Promise<StandupMember> {
    await getOwnedMemberOrThrow(userId, id);
    const updates: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (input.name !== undefined) {
      updates.push(`name = $${i++}`);
      params.push(normalizeName(input.name));
    }
    if (input.isActive !== undefined) {
      updates.push(`is_active = $${i++}`);
      params.push(input.isActive);
    }
    if (input.orderIndex !== undefined) {
      updates.push(`order_index = $${i++}`);
      params.push(input.orderIndex);
    }
    if (updates.length === 0) {
      throw new BadRequestError('At least one field is required to update');
    }

    params.push(id, userId);
    const db = getDbPool();
    try {
      const result = await db.query<MemberRow>(
        `UPDATE standup_members SET ${updates.join(', ')}
         WHERE id = $${i++} AND user_id = $${i}
         RETURNING ${MEMBER_RETURNING}`,
        params
      );
      return mapMember(result.rows[0]);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        throw new BadRequestError('A standup member with that name already exists');
      }
      throw error;
    }
  },

  async deleteMember(userId: number, id: string): Promise<boolean> {
    await getOwnedMemberOrThrow(userId, id);
    const db = getDbPool();
    const inUse = await db.query<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM standup_items WHERE member_id = $1) AS exists`,
      [id]
    );
    if (inUse.rows[0]?.exists) {
      throw new BadRequestError('Cannot delete a member with standup items; deactivate instead');
    }
    await db.query(`DELETE FROM standup_members WHERE id = $1 AND user_id = $2`, [id, userId]);
    return true;
  },

  async getDayView(userId: number, date: string): Promise<StandupDayView> {
    const dayDate = assertDateString(date);
    const day = await getDayByDate(userId, dayDate);
    const items = day ? await listItemsForDay(userId, day) : [];
    const carryOverCandidates =
      day?.status === 'open'
        ? await listUnfinishedForDate(userId, previousDateString(dayDate))
        : [];
    return {
      day: day ? mapDay(day) : null,
      items,
      carryOverCandidates,
    };
  },

  async openDay(userId: number, date: string): Promise<StandupDayView> {
    const dayDate = assertDateString(date);
    const db = getDbPool();
    const existing = await getDayByDate(userId, dayDate);

    if (!existing) {
      const id = generateUuidV7();
      await db.query(
        `INSERT INTO standup_days (id, user_id, date, status, opened_at)
         VALUES ($1, $2, $3::date, 'open', NOW())`,
        [id, userId, dayDate]
      );
    } else if (existing.status === 'closed') {
      await db.query(
        `UPDATE standup_days
         SET status = 'open', closed_at = NULL, opened_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [existing.id, userId]
      );
    }

    return this.getDayView(userId, dayDate);
  },

  async closeDay(userId: number, date: string): Promise<StandupDay> {
    const dayDate = assertDateString(date);
    const day = await getOwnedDayOrThrow(userId, dayDate);
    if (day.status === 'closed') return mapDay(day);

    const db = getDbPool();
    const result = await db.query<DayRow>(
      `UPDATE standup_days
       SET status = 'closed', closed_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING ${DAY_RETURNING}`,
      [day.id, userId]
    );
    return mapDay(result.rows[0]);
  },

  async carryOverItems(
    userId: number,
    input: CarryOverStandupItemsInput
  ): Promise<StandupItem[]> {
    const dayDate = assertDateString(input.date);
    if (!input.itemIds.length) return [];

    const day = await getOwnedDayOrThrow(userId, dayDate);
    await assertDayIsOpen(day);

    const prevDate = previousDateString(dayDate);
    const prevDay = await getDayByDate(userId, prevDate);
    if (!prevDay) {
      throw new BadRequestError('No standup day found for the previous calendar day');
    }

    const db = getDbPool();
    const uniqueIds = [...new Set(input.itemIds)];
    const sourceResult = await db.query<ItemRow>(
      `SELECT ${ITEM_RETURNING}
       FROM standup_items
       WHERE user_id = $1 AND day_id = $2 AND id = ANY($3::uuid[])`,
      [userId, prevDay.id, uniqueIds]
    );

    if (sourceResult.rows.length !== uniqueIds.length) {
      throw new BadRequestError('One or more items are not carry-over candidates from yesterday');
    }

    const unfinished = sourceResult.rows.filter((row) => row.status !== 'completed');
    if (unfinished.length !== sourceResult.rows.length) {
      throw new BadRequestError('Cannot carry over completed items');
    }

    const created: StandupItem[] = [];
    let orderIndex = await nextItemOrderIndex(day.id);

    for (const source of unfinished) {
      const already = await db.query<{ id: string }>(
        `SELECT id FROM standup_items WHERE day_id = $1 AND source_item_id = $2`,
        [day.id, source.id]
      );
      if (already.rows.length > 0) continue;

      const id = generateUuidV7();
      const result = await db.query<ItemRow>(
        `INSERT INTO standup_items (
           id, user_id, day_id, member_id, title, notes, ticket_number, status, blocked_reason,
           backlog_started_on, source_item_id, order_index
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11, $12)
         RETURNING ${ITEM_RETURNING}`,
        [
          id,
          userId,
          day.id,
          source.member_id,
          source.title,
          source.notes,
          source.ticket_number,
          source.status,
          source.blocked_reason,
          formatDateForApi(source.backlog_started_on),
          source.id,
          orderIndex++,
        ]
      );
      created.push(mapItem(result.rows[0], dayDate));
    }

    return created;
  },

  async createItem(userId: number, input: CreateStandupItemInput): Promise<StandupItem> {
    const dayDate = assertDateString(input.date);
    const title = normalizeName(input.title);
    const member = await getOwnedMemberOrThrow(userId, input.memberId);
    if (!member.is_active) {
      throw new BadRequestError('Standup member is inactive');
    }

    const day = await getOwnedDayOrThrow(userId, dayDate);
    await assertDayIsOpen(day);

    const status = input.status ?? 'pending';
    if (status === 'blocked' && !input.blockedReason?.trim()) {
      throw new BadRequestError('blockedReason is required when status is blocked');
    }

    const orderIndex = input.orderIndex ?? (await nextItemOrderIndex(day.id));
    const id = generateUuidV7();
    const db = getDbPool();
    const result = await db.query<ItemRow>(
      `INSERT INTO standup_items (
         id, user_id, day_id, member_id, title, notes, ticket_number, status, blocked_reason,
         backlog_started_on, order_index
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date, $11)
       RETURNING ${ITEM_RETURNING}`,
      [
        id,
        userId,
        day.id,
        input.memberId,
        title,
        input.notes ?? null,
        input.ticketNumber?.trim() || null,
        status,
        status === 'blocked' ? input.blockedReason!.trim() : null,
        dayDate,
        orderIndex,
      ]
    );
    return mapItem(result.rows[0], dayDate);
  },

  async updateItem(
    userId: number,
    id: string,
    input: UpdateStandupItemInput
  ): Promise<StandupItem> {
    const item = await getOwnedItemOrThrow(userId, id);
    const dayResult = await getDbPool().query<DayRow>(
      `SELECT ${DAY_RETURNING} FROM standup_days WHERE id = $1 AND user_id = $2`,
      [item.day_id, userId]
    );
    const day = dayResult.rows[0];
    if (!day) throw new NotFoundError('Standup day not found');
    await assertDayIsOpen(day);

    if (input.memberId !== undefined) {
      const member = await getOwnedMemberOrThrow(userId, input.memberId);
      if (!member.is_active && input.memberId !== item.member_id) {
        throw new BadRequestError('Standup member is inactive');
      }
    }

    const updates: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (input.memberId !== undefined) {
      updates.push(`member_id = $${i++}`);
      params.push(input.memberId);
    }
    if (input.title !== undefined) {
      updates.push(`title = $${i++}`);
      params.push(normalizeName(input.title));
    }
    if (input.notes !== undefined) {
      updates.push(`notes = $${i++}`);
      params.push(input.notes);
    }
    if (input.ticketNumber !== undefined) {
      updates.push(`ticket_number = $${i++}`);
      params.push(input.ticketNumber?.trim() || null);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${i++}`);
      params.push(input.status);
      if (input.status === 'blocked') {
        updates.push(`blocked_reason = $${i++}`);
        params.push((input.blockedReason ?? item.blocked_reason)?.trim() || null);
      } else {
        updates.push(`blocked_reason = $${i++}`);
        params.push(null);
      }
    } else if (input.blockedReason !== undefined) {
      updates.push(`blocked_reason = $${i++}`);
      params.push(input.blockedReason?.trim() || null);
    }
    if (input.orderIndex !== undefined) {
      updates.push(`order_index = $${i++}`);
      params.push(input.orderIndex);
    }
    if (updates.length === 0) {
      throw new BadRequestError('At least one field is required to update');
    }

    params.push(id, userId);
    const result = await getDbPool().query<ItemRow>(
      `UPDATE standup_items SET ${updates.join(', ')}
       WHERE id = $${i++} AND user_id = $${i}
       RETURNING ${ITEM_RETURNING}`,
      params
    );
    return mapItem(result.rows[0], formatDateForApi(day.date));
  },

  async deleteItem(userId: number, id: string): Promise<boolean> {
    const item = await getOwnedItemOrThrow(userId, id);
    const day = await getDbPool().query<DayRow>(
      `SELECT ${DAY_RETURNING} FROM standup_days WHERE id = $1 AND user_id = $2`,
      [item.day_id, userId]
    );
    if (!day.rows[0]) throw new NotFoundError('Standup day not found');
    await assertDayIsOpen(day.rows[0]);

    await getDbPool().query(`DELETE FROM standup_items WHERE id = $1 AND user_id = $2`, [
      id,
      userId,
    ]);
    return true;
  },

  async getDaySummary(userId: number, date: string): Promise<StandupDaySummary> {
    const dayDate = assertDateString(date);
    const view = await this.getDayView(userId, dayDate);
    const members = await this.listMembers(userId, true);
    const memberNameById = new Map(members.map((m) => [m.id, m.name]));

    const byMember = new Map<string, StandupItem[]>();
    for (const item of view.items) {
      const list = byMember.get(item.memberId) ?? [];
      list.push(item);
      byMember.set(item.memberId, list);
    }

    const groups: StandupSummaryMemberGroup[] = [...byMember.entries()]
      .map(([memberId, items]) => ({
        memberId,
        memberName: memberNameById.get(memberId) ?? 'Sin responsable',
        items,
      }))
      .sort((a, b) => a.memberName.localeCompare(b.memberName, 'es'));

    return {
      date: dayDate,
      groups,
      text: buildSummaryText(groups),
    };
  },

  async getWeekView(userId: number, endDate: string, days = 5): Promise<StandupWeekEntry[]> {
    const anchor = assertDateString(endDate);
    const dates: string[] = [];
    let cursor = anchor;
    while (dates.length < days) {
      if (!isWeekend(cursor)) dates.push(cursor);
      cursor = previousDateString(cursor);
    }
    dates.reverse();

    const db = getDbPool();
    const dayRows = await db.query<DayRow>(
      `SELECT ${DAY_RETURNING} FROM standup_days WHERE user_id = $1 AND date = ANY($2::date[])`,
      [userId, dates]
    );
    const dayByDate = new Map(dayRows.rows.map((row) => [formatDateForApi(row.date), row]));

    const dayIds = dayRows.rows.map((row) => row.id);
    const itemRows = dayIds.length
      ? await db.query<ItemRow>(
          `SELECT ${ITEM_RETURNING}
           FROM standup_items
           WHERE user_id = $1 AND day_id = ANY($2::uuid[])
           ORDER BY order_index ASC, created_at ASC`,
          [userId, dayIds]
        )
      : { rows: [] as ItemRow[] };

    const itemsByDayId = new Map<string, ItemRow[]>();
    for (const row of itemRows.rows) {
      const list = itemsByDayId.get(row.day_id) ?? [];
      list.push(row);
      itemsByDayId.set(row.day_id, list);
    }

    return dates.map((date) => {
      const dayRow = dayByDate.get(date) ?? null;
      const items = dayRow ? (itemsByDayId.get(dayRow.id) ?? []).map((row) => mapItem(row, date)) : [];
      return {
        date,
        day: dayRow ? mapDay(dayRow) : null,
        items,
      };
    });
  },

  async createTodoFromItem(userId: number, itemId: string) {
    const item = await getOwnedItemOrThrow(userId, itemId);
    if (item.linked_todo_id != null) {
      return todoService.getTodoById(String(item.linked_todo_id), userId);
    }

    const settings = await userSettingsService.getMySettings(userId);
    if (!settings.standupTodoFolderId) {
      throw new BadRequestError(
        'Configure standupTodoFolderId in user settings before creating todos from standup'
      );
    }
    await todoFolderService.getFolderById(settings.standupTodoFolderId, userId);

    const ticket = item.ticket_number ? `Ticket: #${item.ticket_number}` : null;
    const description = [item.notes, ticket].filter(Boolean).join('\n\n') || null;

    const todo = await todoService.createTodo(userId, {
      title: item.title,
      description,
      folderId: settings.standupTodoFolderId,
      status: item.status === 'completed' ? 'completed' : item.status === 'in_progress' ? 'in_progress' : 'pending',
    });

    await getDbPool().query(
      `UPDATE standup_items SET linked_todo_id = $1 WHERE id = $2 AND user_id = $3`,
      [parseInt(todo.id, 10), itemId, userId]
    );

    return todo;
  },

  formatDateForApi,
  previousDateString,
  daysBetween,
  assertDateString,
};
