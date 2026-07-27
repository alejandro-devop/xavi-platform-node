export interface HabitMeasure {
  id: string;
  userId: number;
  name: string;
  abbreviation: string | null;
  type: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHabitMeasureInput {
  id?: string | null;
  name: string;
  abbreviation?: string | null;
  type?: string | null;
}

export interface UpdateHabitMeasureInput {
  name?: string;
  abbreviation?: string | null;
  type?: string | null;
}
