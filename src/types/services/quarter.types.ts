export type ProjectStatus = 'active' | 'paused' | 'completed' | 'archived';
export type ObjectiveStatus = 'pending' | 'in_progress' | 'completed';
export type QuarterStatus = 'planning' | 'active' | 'completed';
export type ProjectMemberRole = 'owner' | 'editor';

export type Project = {
  id: string;
  userId: number;
  name: string;
  description: string | null;
  priority: number;
  status: ProjectStatus;
  createdAt: Date;
  updatedAt: Date;
  objectives?: ProjectObjective[];
  members?: ProjectMember[];
};

export type ProjectObjective = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: ObjectiveStatus;
  orderIndex: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectMember = {
  id: string;
  projectId: string;
  userId: number;
  role: ProjectMemberRole;
  invitedAt: Date;
  acceptedAt: Date | null;
};

export type Quarter = {
  id: string;
  userId: number;
  name: string;
  startDate: Date;
  endDate: Date;
  status: QuarterStatus;
  retrospectiveNotes: string | null;
  summaryNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  projects?: QuarterProject[];
};

export type QuarterProject = {
  id: string;
  quarterId: string;
  projectId: string;
  weeklyHours: number;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
};

export type SessionLog = {
  id: string;
  quarterId: string;
  projectId: string;
  userId: number;
  sessionDate: Date;
  weekStartDate: Date;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
};

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export type WeekScheduleSlot = {
  id: string;
  quarterId: string;
  projectId: string;
  userId: number;
  dayOfWeek: DayOfWeek;
  startTime: string | null;
  hours: number;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  project?: Project;
};

export type CreateWeekScheduleSlotInput = {
  quarterId: string;
  projectId: string;
  dayOfWeek: DayOfWeek;
  startTime?: string;
  hours: number;
  notes?: string;
};

export type UpdateWeekScheduleSlotInput = {
  startTime?: string | null;
  hours?: number;
  notes?: string | null;
};

export type CreateProjectInput = {
  name: string;
  description?: string;
  priority?: number;
  status?: ProjectStatus;
};

export type UpdateProjectInput = {
  name?: string;
  description?: string;
  priority?: number;
  status?: ProjectStatus;
};

export type CreateObjectiveInput = {
  projectId: string;
  title: string;
  description?: string;
  orderIndex?: number;
};

export type UpdateObjectiveInput = {
  title?: string;
  description?: string;
  status?: ObjectiveStatus;
  orderIndex?: number;
};

export type CreateQuarterInput = {
  name: string;
  startDate: string;
  endDate: string;
};

export type UpdateQuarterInput = {
  name?: string;
  startDate?: string;
  endDate?: string;
  retrospectiveNotes?: string;
  summaryNotes?: string;
};

export type AddQuarterProjectInput = {
  quarterId: string;
  projectId: string;
  weeklyHours: number;
};

export type UpdateQuarterProjectInput = {
  weeklyHours: number;
};

export type CreateSessionLogInput = {
  quarterId: string;
  projectId: string;
  sessionDate: string;
  content: string;
};

export type UpdateSessionLogInput = {
  content?: string;
};
