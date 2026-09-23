export type VidaDayOfWeek =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export const VIDA_DAYS_OF_WEEK: readonly VidaDayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

export interface VidaItem {
  id: string;
  userId: number;
  activityId: string;
  days: VidaDayOfWeek[];
  /** Hora local "HH:mm"; null mientras el ítem no tenga hora. */
  startTime: string | null;
  /** Duración en minutos (entero positivo); null mientras no tenga duración. */
  durationMinutes: number | null;
  notes: string | null;
  isActive: boolean;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VidaTakenToday {
  id: string;
  userId: number;
  vidaItemId: string;
  /** Fecha civil YYYY-MM-DD. */
  date: string;
  createdAt: Date;
}

export interface VidaSuggestion {
  item: VidaItem;
  takenToday: boolean;
}

export interface CreateVidaItemInput {
  activityId: string;
  days: VidaDayOfWeek[];
  /** Hora local "HH:mm"; null o ausente deja el ítem sin hora. */
  startTime?: string | null;
  /** Duración en minutos (entero positivo); null o ausente lo deja sin duración. */
  durationMinutes?: number | null;
  notes?: string | null;
  orderIndex?: number;
  clientId?: string | null;
}

export interface UpdateVidaItemInput {
  days?: VidaDayOfWeek[];
  /** Hora local "HH:mm"; null limpia la hora. */
  startTime?: string | null;
  /** Duración en minutos (entero positivo); null limpia la duración. */
  durationMinutes?: number | null;
  notes?: string | null;
  isActive?: boolean;
  orderIndex?: number;
}

export interface VidaGoal {
  id: string;
  userId: number;
  /** Identidad estable de la meta. La automática es 'work'. */
  slug: string;
  name: string;
  icon: string | null;
  color: string | null;
  targetMinutes: number;
  /**
   * Días de la semana en que esta meta cuenta ('monday'…'sunday'). Mismo
   * vocabulario que `VidaItem.days` y que el enum VidaDayOfWeek del SDL.
   * Nunca vacío: la columna tiene CHECK (cardinality >= 1) (migración 070).
   */
  activeDays: string[];
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SetCategoryGoalInput {
  categoryId: string;
  /** false: se quita el puntero (goal_id = NULL). */
  attached: boolean;
  /** Meta explícita. Omitida con `attached: true`: la meta por defecto del usuario, creada si no existe. */
  goalId?: string | null;
}
