export interface HabitCategory {
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

export interface CreateHabitCategoryInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  orderIndex?: number;
}

export interface UpdateHabitCategoryInput {
  name?: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  orderIndex?: number;
}
