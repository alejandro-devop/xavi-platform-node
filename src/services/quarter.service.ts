import { getDbPool } from '../shared/database/pool';
import { ForbiddenError, NotFoundError, BadRequestError } from '../shared/errors';
import type {
  Project,
  ProjectObjective,
  ProjectMember,
  Quarter,
  QuarterProject,
  SessionLog,
  WeekScheduleSlot,
  CreateProjectInput,
  UpdateProjectInput,
  CreateObjectiveInput,
  UpdateObjectiveInput,
  CreateQuarterInput,
  UpdateQuarterInput,
  AddQuarterProjectInput,
  UpdateQuarterProjectInput,
  CreateSessionLogInput,
  UpdateSessionLogInput,
  CreateWeekScheduleSlotInput,
  UpdateWeekScheduleSlotInput,
} from '../types/services/quarter.types';

// ─── Row types ────────────────────────────────────────────────────────────────

type ProjectRow = {
  id: string;
  user_id: number;
  name: string;
  description: string | null;
  priority: number;
  status: string;
  created_at: Date;
  updated_at: Date;
};

type ObjectiveRow = {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: string;
  order_index: number;
  created_at: Date;
  updated_at: Date;
};

type MemberRow = {
  id: string;
  project_id: string;
  user_id: number;
  role: string;
  invited_at: Date;
  accepted_at: Date | null;
};

type QuarterRow = {
  id: string;
  user_id: number;
  name: string;
  start_date: Date;
  end_date: Date;
  status: string;
  retrospective_notes: string | null;
  summary_notes: string | null;
  created_at: Date;
  updated_at: Date;
};

type QuarterProjectRow = {
  id: string;
  quarter_id: string;
  project_id: string;
  weekly_hours: string;
  created_at: Date;
  updated_at: Date;
};

type SessionLogRow = {
  id: string;
  quarter_id: string;
  project_id: string;
  user_id: number;
  session_date: Date;
  week_start_date: Date;
  content: string;
  created_at: Date;
  updated_at: Date;
};

// ─── Mappers ──────────────────────────────────────────────────────────────────

function mapProject(row: ProjectRow, extras?: { objectives?: ProjectObjective[]; members?: ProjectMember[] }): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    priority: row.priority,
    status: row.status as Project['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    objectives: extras?.objectives,
    members: extras?.members,
  };
}

function mapObjective(row: ObjectiveRow): ProjectObjective {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.status as ProjectObjective['status'],
    orderIndex: row.order_index,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: MemberRow): ProjectMember {
  return {
    id: row.id,
    projectId: row.project_id,
    userId: row.user_id,
    role: row.role as ProjectMember['role'],
    invitedAt: row.invited_at,
    acceptedAt: row.accepted_at,
  };
}

function mapQuarter(row: QuarterRow, extras?: { projects?: QuarterProject[] }): Quarter {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status as Quarter['status'],
    retrospectiveNotes: row.retrospective_notes,
    summaryNotes: row.summary_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    projects: extras?.projects,
  };
}

function mapQuarterProject(row: QuarterProjectRow, extras?: { project?: Project }): QuarterProject {
  return {
    id: row.id,
    quarterId: row.quarter_id,
    projectId: row.project_id,
    weeklyHours: parseFloat(row.weekly_hours),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    project: extras?.project,
  };
}

function mapSessionLog(row: SessionLogRow, extras?: { project?: Project }): SessionLog {
  return {
    id: row.id,
    quarterId: row.quarter_id,
    projectId: row.project_id,
    userId: row.user_id,
    sessionDate: row.session_date,
    weekStartDate: row.week_start_date,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    project: extras?.project,
  };
}

type WeekScheduleSlotRow = {
  id: string;
  quarter_id: string;
  project_id: string;
  user_id: number;
  day_of_week: string;
  start_time: string | null;
  hours: string;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
};

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function assertProjectAccess(projectId: string, userId: number): Promise<void> {
  const db = getDbPool();
  const result = await db.query<{ count: string }>(
    `SELECT COUNT(*) FROM projects p
     WHERE p.id = $1
       AND (
         p.user_id = $2
         OR EXISTS (
           SELECT 1 FROM project_members pm
           WHERE pm.project_id = p.id
             AND pm.user_id = $2
             AND pm.accepted_at IS NOT NULL
         )
       )`,
    [projectId, userId],
  );
  if (parseInt(result.rows[0].count, 10) === 0) {
    throw new ForbiddenError('You do not have access to this project');
  }
}

async function assertQuarterOwnership(quarterId: string, userId: number): Promise<QuarterRow> {
  const db = getDbPool();
  const result = await db.query<QuarterRow>(
    `SELECT * FROM quarters WHERE id = $1`,
    [quarterId],
  );
  if (result.rows.length === 0) throw new NotFoundError('Quarter not found');
  if (result.rows[0].user_id !== userId) throw new ForbiddenError('You do not own this quarter');
  return result.rows[0];
}

// ─── Projects ─────────────────────────────────────────────────────────────────

async function listProjects(userId: number): Promise<Project[]> {
  const db = getDbPool();
  const result = await db.query<ProjectRow>(
    `SELECT p.* FROM projects p
     WHERE p.user_id = $1
        OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id
            AND pm.user_id = $1
            AND pm.accepted_at IS NOT NULL
        )
     ORDER BY p.priority DESC, p.created_at DESC`,
    [userId],
  );
  return result.rows.map((r) => mapProject(r));
}

async function getProjectById(id: string, userId: number): Promise<Project> {
  await assertProjectAccess(id, userId);
  const db = getDbPool();
  const result = await db.query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [id]);
  if (result.rows.length === 0) throw new NotFoundError('Project not found');
  const objectives = await listObjectivesForProject(id);
  const members = await listMembersForProject(id);
  return mapProject(result.rows[0], { objectives, members });
}

async function createProject(userId: number, input: CreateProjectInput): Promise<Project> {
  const db = getDbPool();
  const result = await db.query<ProjectRow>(
    `INSERT INTO projects (user_id, name, description, priority, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, input.name, input.description ?? null, input.priority ?? 0, input.status ?? 'active'],
  );
  const project = result.rows[0];
  // Auto-insert creator as owner member
  await db.query(
    `INSERT INTO project_members (project_id, user_id, role, accepted_at)
     VALUES ($1, $2, 'owner', CURRENT_TIMESTAMP)`,
    [project.id, userId],
  );
  return mapProject(project);
}

async function updateProject(id: string, userId: number, input: UpdateProjectInput): Promise<Project> {
  await assertProjectAccess(id, userId);
  const db = getDbPool();
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined) { fields.push(`name = $${idx++}`); params.push(input.name); }
  if (input.description !== undefined) { fields.push(`description = $${idx++}`); params.push(input.description); }
  if (input.priority !== undefined) { fields.push(`priority = $${idx++}`); params.push(input.priority); }
  if (input.status !== undefined) { fields.push(`status = $${idx++}`); params.push(input.status); }

  if (fields.length > 0) {
    params.push(id);
    await db.query(`UPDATE projects SET ${fields.join(', ')} WHERE id = $${idx}`, params);
  }

  return getProjectById(id, userId);
}

async function deleteProject(id: string, userId: number): Promise<boolean> {
  const db = getDbPool();
  const result = await db.query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [id]);
  if (result.rows.length === 0) throw new NotFoundError('Project not found');
  if (result.rows[0].user_id !== userId) throw new ForbiddenError('Only the project owner can delete it');
  await db.query(`DELETE FROM projects WHERE id = $1`, [id]);
  return true;
}

// ─── Objectives ───────────────────────────────────────────────────────────────

async function listObjectivesForProject(projectId: string): Promise<ProjectObjective[]> {
  const db = getDbPool();
  const result = await db.query<ObjectiveRow>(
    `SELECT * FROM project_objectives WHERE project_id = $1 ORDER BY order_index ASC, created_at ASC`,
    [projectId],
  );
  return result.rows.map(mapObjective);
}

async function addObjective(userId: number, input: CreateObjectiveInput): Promise<ProjectObjective> {
  await assertProjectAccess(input.projectId, userId);
  const db = getDbPool();
  const result = await db.query<ObjectiveRow>(
    `INSERT INTO project_objectives (project_id, title, description, order_index)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [input.projectId, input.title, input.description ?? null, input.orderIndex ?? 0],
  );
  return mapObjective(result.rows[0]);
}

async function updateObjective(id: string, userId: number, input: UpdateObjectiveInput): Promise<ProjectObjective> {
  const db = getDbPool();
  const objResult = await db.query<ObjectiveRow>(`SELECT * FROM project_objectives WHERE id = $1`, [id]);
  if (objResult.rows.length === 0) throw new NotFoundError('Objective not found');
  await assertProjectAccess(objResult.rows[0].project_id, userId);

  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.title !== undefined) { fields.push(`title = $${idx++}`); params.push(input.title); }
  if (input.description !== undefined) { fields.push(`description = $${idx++}`); params.push(input.description); }
  if (input.status !== undefined) { fields.push(`status = $${idx++}`); params.push(input.status); }
  if (input.orderIndex !== undefined) { fields.push(`order_index = $${idx++}`); params.push(input.orderIndex); }

  if (fields.length > 0) {
    params.push(id);
    await db.query(`UPDATE project_objectives SET ${fields.join(', ')} WHERE id = $${idx}`, params);
  }

  const updated = await db.query<ObjectiveRow>(`SELECT * FROM project_objectives WHERE id = $1`, [id]);
  return mapObjective(updated.rows[0]);
}

async function removeObjective(id: string, userId: number): Promise<boolean> {
  const db = getDbPool();
  const result = await db.query<ObjectiveRow>(`SELECT * FROM project_objectives WHERE id = $1`, [id]);
  if (result.rows.length === 0) throw new NotFoundError('Objective not found');
  await assertProjectAccess(result.rows[0].project_id, userId);
  await db.query(`DELETE FROM project_objectives WHERE id = $1`, [id]);
  return true;
}

// ─── Members ──────────────────────────────────────────────────────────────────

async function listMembersForProject(projectId: string): Promise<ProjectMember[]> {
  const db = getDbPool();
  const result = await db.query<MemberRow>(
    `SELECT * FROM project_members WHERE project_id = $1 ORDER BY invited_at ASC`,
    [projectId],
  );
  return result.rows.map(mapMember);
}

// ─── Quarters ─────────────────────────────────────────────────────────────────

async function listQuarters(userId: number): Promise<Quarter[]> {
  const db = getDbPool();
  const result = await db.query<QuarterRow>(
    `SELECT * FROM quarters WHERE user_id = $1 ORDER BY start_date DESC`,
    [userId],
  );
  return result.rows.map((r) => mapQuarter(r));
}

async function getActiveQuarter(userId: number): Promise<Quarter | null> {
  const db = getDbPool();
  const result = await db.query<QuarterRow>(
    `SELECT * FROM quarters WHERE user_id = $1 AND status = 'active' LIMIT 1`,
    [userId],
  );
  if (result.rows.length === 0) return null;
  const quarter = result.rows[0];
  const projects = await listQuarterProjects(quarter.id, userId);
  return mapQuarter(quarter, { projects });
}

async function getQuarterById(id: string, userId: number): Promise<Quarter> {
  const row = await assertQuarterOwnership(id, userId);
  const projects = await listQuarterProjects(id, userId);
  return mapQuarter(row, { projects });
}

async function createQuarter(userId: number, input: CreateQuarterInput): Promise<Quarter> {
  const db = getDbPool();
  const result = await db.query<QuarterRow>(
    `INSERT INTO quarters (user_id, name, start_date, end_date)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [userId, input.name, input.startDate, input.endDate],
  );
  return mapQuarter(result.rows[0]);
}

async function activateQuarter(id: string, userId: number): Promise<Quarter> {
  const db = getDbPool();
  const active = await getActiveQuarter(userId);
  if (active) throw new BadRequestError('There is already an active quarter. Complete it before activating a new one.');
  const row = await assertQuarterOwnership(id, userId);
  if (row.status !== 'planning') throw new BadRequestError('Only quarters in planning status can be activated');
  await db.query(`UPDATE quarters SET status = 'active' WHERE id = $1`, [id]);
  return getQuarterById(id, userId);
}

async function completeQuarter(id: string, userId: number, input: UpdateQuarterInput): Promise<Quarter> {
  const db = getDbPool();
  const row = await assertQuarterOwnership(id, userId);
  if (row.status !== 'active') throw new BadRequestError('Only active quarters can be completed');
  await db.query(
    `UPDATE quarters SET status = 'completed', retrospective_notes = $2, summary_notes = $3 WHERE id = $1`,
    [id, input.retrospectiveNotes ?? row.retrospective_notes, input.summaryNotes ?? row.summary_notes],
  );
  return getQuarterById(id, userId);
}

async function updateQuarter(id: string, userId: number, input: UpdateQuarterInput): Promise<Quarter> {
  await assertQuarterOwnership(id, userId);
  const db = getDbPool();
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined) { fields.push(`name = $${idx++}`); params.push(input.name); }
  if (input.startDate !== undefined) { fields.push(`start_date = $${idx++}`); params.push(input.startDate); }
  if (input.endDate !== undefined) { fields.push(`end_date = $${idx++}`); params.push(input.endDate); }
  if (input.retrospectiveNotes !== undefined) { fields.push(`retrospective_notes = $${idx++}`); params.push(input.retrospectiveNotes); }
  if (input.summaryNotes !== undefined) { fields.push(`summary_notes = $${idx++}`); params.push(input.summaryNotes); }

  if (fields.length > 0) {
    params.push(id);
    await db.query(`UPDATE quarters SET ${fields.join(', ')} WHERE id = $${idx}`, params);
  }

  return getQuarterById(id, userId);
}

// ─── Quarter Projects ─────────────────────────────────────────────────────────

async function listQuarterProjects(quarterId: string, userId: number): Promise<QuarterProject[]> {
  const db = getDbPool();
  const result = await db.query<QuarterProjectRow & ProjectRow>(
    `SELECT qp.*, p.name as p_name, p.description as p_description, p.priority as p_priority,
            p.status as p_status, p.user_id as p_user_id, p.created_at as p_created_at, p.updated_at as p_updated_at
     FROM quarter_projects qp
     INNER JOIN projects p ON p.id = qp.project_id
     WHERE qp.quarter_id = $1
     ORDER BY p.priority DESC, p.name ASC`,
    [quarterId],
  );
  return result.rows.map((r: any) => mapQuarterProject(r, {
    project: mapProject({
      id: r.project_id,
      user_id: r.p_user_id,
      name: r.p_name,
      description: r.p_description,
      priority: r.p_priority,
      status: r.p_status,
      created_at: r.p_created_at,
      updated_at: r.p_updated_at,
    }),
  }));
}

async function addProjectToQuarter(userId: number, input: AddQuarterProjectInput): Promise<QuarterProject> {
  await assertQuarterOwnership(input.quarterId, userId);
  await assertProjectAccess(input.projectId, userId);
  const db = getDbPool();
  const result = await db.query<QuarterProjectRow>(
    `INSERT INTO quarter_projects (quarter_id, project_id, weekly_hours)
     VALUES ($1, $2, $3)
     ON CONFLICT (quarter_id, project_id) DO UPDATE SET weekly_hours = EXCLUDED.weekly_hours
     RETURNING *`,
    [input.quarterId, input.projectId, input.weeklyHours],
  );
  const qp = result.rows[0];
  const projectResult = await db.query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [qp.project_id]);
  return mapQuarterProject(qp, { project: mapProject(projectResult.rows[0]) });
}

async function updateQuarterProject(id: string, userId: number, input: UpdateQuarterProjectInput): Promise<QuarterProject> {
  const db = getDbPool();
  const existing = await db.query<QuarterProjectRow>(`SELECT * FROM quarter_projects WHERE id = $1`, [id]);
  if (existing.rows.length === 0) throw new NotFoundError('Quarter project not found');
  await assertQuarterOwnership(existing.rows[0].quarter_id, userId);
  await db.query(`UPDATE quarter_projects SET weekly_hours = $1 WHERE id = $2`, [input.weeklyHours, id]);
  const updated = await db.query<QuarterProjectRow>(`SELECT * FROM quarter_projects WHERE id = $1`, [id]);
  const projectResult = await db.query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [updated.rows[0].project_id]);
  return mapQuarterProject(updated.rows[0], { project: mapProject(projectResult.rows[0]) });
}

async function removeProjectFromQuarter(id: string, userId: number): Promise<boolean> {
  const db = getDbPool();
  const existing = await db.query<QuarterProjectRow>(`SELECT * FROM quarter_projects WHERE id = $1`, [id]);
  if (existing.rows.length === 0) throw new NotFoundError('Quarter project not found');
  await assertQuarterOwnership(existing.rows[0].quarter_id, userId);
  await db.query(`DELETE FROM quarter_projects WHERE id = $1`, [id]);
  return true;
}

// ─── Session Logs ─────────────────────────────────────────────────────────────

function getWeekStartDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getUTCDay();
  const diff = date.getUTCDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setUTCDate(diff);
  return monday.toISOString().split('T')[0];
}

async function listSessionLogs(quarterId: string, userId: number, projectId?: string): Promise<SessionLog[]> {
  const db = getDbPool();
  const conditions = ['sl.quarter_id = $1', '(sl.user_id = $2 OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = sl.project_id AND pm.user_id = $2 AND pm.accepted_at IS NOT NULL))'];
  const params: unknown[] = [quarterId, userId];
  let idx = 3;

  if (projectId) {
    conditions.push(`sl.project_id = $${idx++}`);
    params.push(projectId);
  }

  const result = await db.query<SessionLogRow>(
    `SELECT sl.* FROM session_logs sl WHERE ${conditions.join(' AND ')} ORDER BY sl.session_date DESC`,
    params,
  );
  return result.rows.map((r) => mapSessionLog(r));
}

async function listSessionLogsByProject(projectId: string, userId: number): Promise<SessionLog[]> {
  await assertProjectAccess(projectId, userId);
  const db = getDbPool();
  const result = await db.query<SessionLogRow>(
    `SELECT sl.* FROM session_logs sl WHERE sl.project_id = $1 ORDER BY sl.session_date DESC`,
    [projectId],
  );
  return result.rows.map((r) => mapSessionLog(r));
}

async function createSessionLog(userId: number, input: CreateSessionLogInput): Promise<SessionLog> {
  await assertQuarterOwnership(input.quarterId, userId);
  await assertProjectAccess(input.projectId, userId);
  const db = getDbPool();
  const weekStartDate = getWeekStartDate(input.sessionDate);
  const result = await db.query<SessionLogRow>(
    `INSERT INTO session_logs (quarter_id, project_id, user_id, session_date, week_start_date, content)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [input.quarterId, input.projectId, userId, input.sessionDate, weekStartDate, input.content],
  );
  const log = result.rows[0];
  const projectResult = await db.query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [log.project_id]);
  return mapSessionLog(log, { project: mapProject(projectResult.rows[0]) });
}

async function updateSessionLog(id: string, userId: number, input: UpdateSessionLogInput): Promise<SessionLog> {
  const db = getDbPool();
  const existing = await db.query<SessionLogRow>(`SELECT * FROM session_logs WHERE id = $1`, [id]);
  if (existing.rows.length === 0) throw new NotFoundError('Session log not found');
  if (existing.rows[0].user_id !== userId) throw new ForbiddenError('You can only edit your own session logs');

  if (input.content !== undefined) {
    await db.query(`UPDATE session_logs SET content = $1 WHERE id = $2`, [input.content, id]);
  }

  const updated = await db.query<SessionLogRow>(`SELECT * FROM session_logs WHERE id = $1`, [id]);
  const projectResult = await db.query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [updated.rows[0].project_id]);
  return mapSessionLog(updated.rows[0], { project: mapProject(projectResult.rows[0]) });
}

async function deleteSessionLog(id: string, userId: number): Promise<boolean> {
  const db = getDbPool();
  const existing = await db.query<SessionLogRow>(`SELECT * FROM session_logs WHERE id = $1`, [id]);
  if (existing.rows.length === 0) throw new NotFoundError('Session log not found');
  if (existing.rows[0].user_id !== userId) throw new ForbiddenError('You can only delete your own session logs');
  await db.query(`DELETE FROM session_logs WHERE id = $1`, [id]);
  return true;
}

// ─── Week schedule slots ──────────────────────────────────────────────────────

function mapWeekScheduleSlot(row: WeekScheduleSlotRow, extras?: { project?: Project }): WeekScheduleSlot {
  return {
    id: row.id,
    quarterId: row.quarter_id,
    projectId: row.project_id,
    userId: row.user_id,
    dayOfWeek: row.day_of_week as WeekScheduleSlot['dayOfWeek'],
    startTime: row.start_time,
    hours: parseFloat(row.hours),
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    project: extras?.project,
  };
}

async function listWeekScheduleSlots(quarterId: string, userId: number): Promise<WeekScheduleSlot[]> {
  await assertQuarterOwnership(quarterId, userId);
  const db = getDbPool();
  const result = await db.query<WeekScheduleSlotRow & { proj_id: string; proj_name: string; proj_description: string | null; proj_priority: number; proj_status: string; proj_created_at: Date; proj_updated_at: Date }>(
    `SELECT s.*, p.id AS proj_id, p.name AS proj_name, p.description AS proj_description,
            p.priority AS proj_priority, p.status AS proj_status,
            p.created_at AS proj_created_at, p.updated_at AS proj_updated_at
     FROM week_schedule_slots s
     JOIN projects p ON p.id = s.project_id
     WHERE s.quarter_id = $1
     ORDER BY
       CASE s.day_of_week
         WHEN 'monday' THEN 1 WHEN 'tuesday' THEN 2 WHEN 'wednesday' THEN 3
         WHEN 'thursday' THEN 4 WHEN 'friday' THEN 5 WHEN 'saturday' THEN 6
         WHEN 'sunday' THEN 7 END,
       s.start_time NULLS LAST`,
    [quarterId],
  );
  return result.rows.map((row) => {
    const project: Project = {
      id: row.proj_id, userId: row.user_id, name: row.proj_name,
      description: row.proj_description, priority: row.proj_priority,
      status: row.proj_status as Project['status'],
      createdAt: row.proj_created_at, updatedAt: row.proj_updated_at,
      objectives: [], members: [],
    };
    return mapWeekScheduleSlot(row, { project });
  });
}

async function createWeekScheduleSlot(userId: number, input: CreateWeekScheduleSlotInput): Promise<WeekScheduleSlot> {
  await assertQuarterOwnership(input.quarterId, userId);
  await assertProjectAccess(input.projectId, userId);
  const db = getDbPool();
  const result = await db.query<WeekScheduleSlotRow>(
    `INSERT INTO week_schedule_slots (quarter_id, project_id, user_id, day_of_week, start_time, hours, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [input.quarterId, input.projectId, userId, input.dayOfWeek, input.startTime ?? null, input.hours, input.notes ?? null],
  );
  const row = result.rows[0];
  const projectResult = await db.query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [row.project_id]);
  return mapWeekScheduleSlot(row, { project: mapProject(projectResult.rows[0]) });
}

async function updateWeekScheduleSlot(id: string, userId: number, input: UpdateWeekScheduleSlotInput): Promise<WeekScheduleSlot> {
  const db = getDbPool();
  const existing = await db.query<WeekScheduleSlotRow>(`SELECT * FROM week_schedule_slots WHERE id = $1`, [id]);
  if (existing.rows.length === 0) throw new NotFoundError('Schedule slot not found');
  if (existing.rows[0].user_id !== userId) throw new ForbiddenError('You can only edit your own schedule slots');

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;
  if (input.startTime !== undefined) { setClauses.push(`start_time = $${idx++}`); values.push(input.startTime); }
  if (input.hours !== undefined) { setClauses.push(`hours = $${idx++}`); values.push(input.hours); }
  if (input.notes !== undefined) { setClauses.push(`notes = $${idx++}`); values.push(input.notes); }

  if (setClauses.length > 0) {
    await db.query(`UPDATE week_schedule_slots SET ${setClauses.join(', ')} WHERE id = $${idx}`, [...values, id]);
  }

  const updated = await db.query<WeekScheduleSlotRow>(`SELECT * FROM week_schedule_slots WHERE id = $1`, [id]);
  const projectResult = await db.query<ProjectRow>(`SELECT * FROM projects WHERE id = $1`, [updated.rows[0].project_id]);
  return mapWeekScheduleSlot(updated.rows[0], { project: mapProject(projectResult.rows[0]) });
}

async function deleteWeekScheduleSlot(id: string, userId: number): Promise<boolean> {
  const db = getDbPool();
  const existing = await db.query<WeekScheduleSlotRow>(`SELECT * FROM week_schedule_slots WHERE id = $1`, [id]);
  if (existing.rows.length === 0) throw new NotFoundError('Schedule slot not found');
  if (existing.rows[0].user_id !== userId) throw new ForbiddenError('You can only delete your own schedule slots');
  await db.query(`DELETE FROM week_schedule_slots WHERE id = $1`, [id]);
  return true;
}

export const quarterService = {
  // Projects
  listProjects,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  // Objectives
  listObjectivesForProject,
  addObjective,
  updateObjective,
  removeObjective,
  // Members
  listMembersForProject,
  // Quarters
  listQuarters,
  getActiveQuarter,
  getQuarterById,
  createQuarter,
  activateQuarter,
  completeQuarter,
  updateQuarter,
  // Quarter Projects
  listQuarterProjects,
  addProjectToQuarter,
  updateQuarterProject,
  removeProjectFromQuarter,
  // Session Logs
  listSessionLogs,
  listSessionLogsByProject,
  createSessionLog,
  updateSessionLog,
  deleteSessionLog,
  // Week Schedule Slots
  listWeekScheduleSlots,
  createWeekScheduleSlot,
  updateWeekScheduleSlot,
  deleteWeekScheduleSlot,
};
