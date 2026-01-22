-- =========================
-- Postgres schema (idempotente)
-- =========================

-- updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================
-- Tabelas
-- =========================

CREATE TABLE IF NOT EXISTS projects (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  repo_url TEXT,
  demo_url TEXT,
  cover_image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  creator_user_id TEXT,
  visibility TEXT NOT NULL DEFAULT 'PUBLIC'
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'trg_projects_updated_at'
  ) THEN
    CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tags (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS project_tags (
  project_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY(project_id, tag_id),
  CONSTRAINT fk_project_tags_project
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_tags_tag
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- filtros académicos
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ucs (
  id SERIAL PRIMARY KEY,
  course_id INT NOT NULL,
  year INT NOT NULL,
  name TEXT NOT NULL,
  CONSTRAINT fk_ucs_course
    FOREIGN KEY(course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS project_uc (
  project_id INT NOT NULL,
  uc_id INT NOT NULL,
  PRIMARY KEY(project_id, uc_id),
  CONSTRAINT fk_project_uc_project
    FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE,
  CONSTRAINT fk_project_uc_uc
    FOREIGN KEY(uc_id) REFERENCES ucs(id) ON DELETE CASCADE
);

-- =========================
-- Índices
-- =========================
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_ucs_course_year ON ucs(course_id, year);
