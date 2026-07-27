export interface ActivityDayPlanItem {
  id: string;
  userId: number;
  activityId: string;
  /** Fecha local "YYYY-MM-DD". */
  date: string;
  /** Hora local "HH:mm". */
  startTime: string;
  /** Hora local "HH:mm". */
  endTime: string;
  orderIndex: number;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetDayPlanItemInput {
  activityId: string;
  startTime: string;
  endTime: string;
  orderIndex?: number;
  clientId?: string | null;
}

export interface SetDayPlanInput {
  date: string;
  items: SetDayPlanItemInput[];
}

/** Añade un único ítem al plan del día sin reemplazar el resto. */
export interface AddDayPlanItemInput {
  date: string;
  activityId: string;
  startTime: string;
  endTime: string;
  orderIndex?: number;
  clientId?: string | null;
}

export interface UpdateDayPlanItemInput {
  startTime?: string;
  endTime?: string;
  orderIndex?: number;
  isCompleted?: boolean;
}
