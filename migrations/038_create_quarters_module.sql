-- Quarters module: projects pool, objectives, quarters, schedule, session logs, and sharing

-- Global projects pool
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'archived')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_user_id ON projects(user_id);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Project objectives (global to project, not per-quarter)
CREATE TABLE IF NOT EXISTS project_objectives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_project_objectives_project_id ON project_objectives(project_id);

CREATE TRIGGER update_project_objectives_updated_at
  BEFORE UPDATE ON project_objectives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Project members (sharing) — owner is auto-inserted on project creation
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'editor'
    CHECK (role IN ('owner', 'editor')),
  invited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP,
  UNIQUE (project_id, user_id)
);

CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);

-- Quarters
CREATE TABLE IF NOT EXISTS quarters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'planning'
    CHECK (status IN ('planning', 'active', 'completed')),
  retrospective_notes TEXT,
  summary_notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_quarters_user_id ON quarters(user_id);
CREATE INDEX idx_quarters_status ON quarters(user_id, status);

CREATE TRIGGER update_quarters_updated_at
  BEFORE UPDATE ON quarters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Projects assigned to a quarter with weekly hours
CREATE TABLE IF NOT EXISTS quarter_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  weekly_hours NUMERIC(5,1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (quarter_id, project_id)
);

CREATE INDEX idx_quarter_projects_quarter_id ON quarter_projects(quarter_id);
CREATE INDEX idx_quarter_projects_project_id ON quarter_projects(project_id);

CREATE TRIGGER update_quarter_projects_updated_at
  BEFORE UPDATE ON quarter_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Session logs: one per work session, tied to a project and quarter
CREATE TABLE IF NOT EXISTS session_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v7(),
  quarter_id UUID NOT NULL REFERENCES quarters(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  week_start_date DATE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_session_logs_quarter_id ON session_logs(quarter_id);
CREATE INDEX idx_session_logs_project_id ON session_logs(project_id);
CREATE INDEX idx_session_logs_user_id ON session_logs(user_id);
CREATE INDEX idx_session_logs_session_date ON session_logs(project_id, session_date DESC);

CREATE TRIGGER update_session_logs_updated_at
  BEFORE UPDATE ON session_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
