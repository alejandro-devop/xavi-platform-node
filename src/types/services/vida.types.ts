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
