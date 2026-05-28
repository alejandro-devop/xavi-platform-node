export interface ActivityCategory {
  id: string;
  userId: number;
  orderIndex: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateActivityCategoryInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  orderIndex?: number;
}

export interface UpdateActivityCategoryInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  orderIndex?: number;
}
