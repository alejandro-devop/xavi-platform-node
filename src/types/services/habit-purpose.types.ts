export type HabitPurposePlacement = 'pool' | 'want' | 'avoid'

export interface HabitPurpose {
  id: string
  userId: number
  name: string
  icon: string | null
  placement: HabitPurposePlacement
  orderIndex: number
  createdAt: string
  updatedAt: string
}

export interface HabitPurposeInput {
  name: string
  icon?: string | null
  placement?: HabitPurposePlacement
  orderIndex?: number
}

export interface HabitPurposeEditInput extends Partial<HabitPurposeInput> {
  id: string
}
