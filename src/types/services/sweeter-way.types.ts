export type BondStatus = 'pending' | 'accepted' | 'rejected' | 'dissolved';
export type ListCategory = 'restaurant' | 'travel' | 'outdoor' | 'entertainment' | 'culture' | 'other';
export type ItemStatus = 'pending' | 'completed';
export type NotificationType = 'bond_requested' | 'bond_accepted' | 'item_added' | 'item_completed' | 'log_added';
export type EntityType = 'bond' | 'list' | 'item' | 'log';

export type CinnamonBond = {
  id: string;
  requesterId: number;
  addresseeId: number;
  status: BondStatus;
  requestedAt: Date;
  respondedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SweeterList = {
  id: string;
  bondId: string;
  title: string;
  description: string | null;
  category: ListCategory;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ListItem = {
  id: string;
  listId: string;
  title: string;
  description: string | null;
  address: string | null;
  url: string | null;
  status: ItemStatus;
  completedAt: Date | null;
  addedBy: number;
  rating: number | null;
  wouldReturn: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ItemLog = {
  id: string;
  itemId: string;
  userId: number;
  comment: string | null;
  liked: boolean | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SWNotification = {
  id: string;
  recipientId: number;
  actorId: number;
  type: NotificationType;
  entityType: EntityType;
  entityId: string;
  readAt: Date | null;
  payload: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type SWUserPreferences = {
  id: string;
  userId: number;
  emailNotifications: boolean;
  inAppNotifications: boolean;
  pushToken: string | null;
  pushNotificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateListInput = {
  title: string;
  description?: string | null;
  category: ListCategory;
};

export type UpdateListInput = {
  title?: string;
  description?: string | null;
  category?: ListCategory;
};

export type AddListItemInput = {
  title: string;
  description?: string | null;
  address?: string | null;
  url?: string | null;
};

export type UpdateListItemInput = {
  title?: string;
  description?: string | null;
  address?: string | null;
  url?: string | null;
};

export type UpsertItemLogInput = {
  comment?: string | null;
  liked?: boolean | null;
};

export type UpdatePreferencesInput = {
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  pushToken?: string | null;
  pushNotificationsEnabled?: boolean;
};

export type CreateNotificationInput = {
  recipientId: number;
  actorId: number;
  type: NotificationType;
  entityType: EntityType;
  entityId: string;
  payload?: Record<string, unknown>;
};
