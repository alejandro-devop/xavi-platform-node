export type StandupDayStatus = 'open' | 'closed';
export type StandupItemStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface StandupMember {
  id: string;
  userId: number;
  name: string;
  isActive: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StandupDay {
  id: string;
  userId: number;
  date: string;
  status: StandupDayStatus;
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StandupItem {
  id: string;
  userId: number;
  dayId: string;
  memberId: string;
  title: string;
  notes: string | null;
  ticketNumber: string | null;
  status: StandupItemStatus;
  blockedReason: string | null;
  /** Primera fecha civil en la que entró al backlog (se preserva en carryover). */
  backlogStartedOn: string;
  /** Días en backlog respecto a la fecha del día del ítem. */
  daysInBacklog: number;
  sourceItemId: string | null;
  linkedTodoId: string | null;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StandupDayView {
  day: StandupDay | null;
  items: StandupItem[];
  carryOverCandidates: StandupItem[];
}

export interface StandupSummaryMemberGroup {
  memberId: string;
  memberName: string;
  items: StandupItem[];
}

export interface StandupDaySummary {
  date: string;
  groups: StandupSummaryMemberGroup[];
  text: string;
}

export interface StandupWeekEntry {
  date: string;
  day: StandupDay | null;
  items: StandupItem[];
}

export interface CreateStandupMemberInput {
  name: string;
  orderIndex?: number;
}

export interface UpdateStandupMemberInput {
  name?: string;
  isActive?: boolean;
  orderIndex?: number;
}

export interface CreateStandupItemInput {
  date: string;
  memberId: string;
  title: string;
  notes?: string | null;
  ticketNumber?: string | null;
  status?: StandupItemStatus;
  blockedReason?: string | null;
  orderIndex?: number;
}

export interface UpdateStandupItemInput {
  memberId?: string;
  title?: string;
  notes?: string | null;
  ticketNumber?: string | null;
  status?: StandupItemStatus;
  blockedReason?: string | null;
  orderIndex?: number;
}

export interface CarryOverStandupItemsInput {
  date: string;
  itemIds: string[];
}
