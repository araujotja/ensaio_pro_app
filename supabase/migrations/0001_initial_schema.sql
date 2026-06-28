-- 0001_initial_schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enums
CREATE TYPE app_role AS ENUM (
  'admin_org','admin_grupo','maestro','lider_louvor','lider_naipe',
  'spalla','mentor','musico','iniciante','tecnica_producao','convidado'
);

CREATE TYPE task_status AS ENUM ('pendente','enviado','aprovado','reaberto');

CREATE TYPE submission_type AS ENUM ('audio','video','link','texto');

CREATE TYPE feedback_type AS ENUM (
  'aprovado','ajustar','comentario_texto','comentario_audio'
);

CREATE TYPE group_template AS ENUM (
  'coral','orquestra','coral_orquestra','banda','escola_projeto',
  'louvor','louvor_coral','louvor_orquestra','livre'
);

-- Tables

CREATE TABLE organization (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ
);

CREATE TABLE app_group (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organization(id),
  name            TEXT NOT NULL,
  template        group_template NOT NULL DEFAULT 'livre',
  modo_igreja     BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE TABLE nucleus (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES app_group(id),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE category (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES app_group(id),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE profile (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name        TEXT NOT NULL DEFAULT '',
  avatar_url       TEXT,
  is_minor         BOOLEAN NOT NULL DEFAULT false,
  parental_consent BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE membership (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id       UUID NOT NULL REFERENCES app_group(id) ON DELETE CASCADE,
  role           app_role NOT NULL DEFAULT 'musico',
  nucleus_id     UUID REFERENCES nucleus(id),
  is_iniciante   BOOLEAN NOT NULL DEFAULT false,
  is_lider_naipe BOOLEAN NOT NULL DEFAULT false,
  is_spalla      BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, group_id)
);

CREATE TABLE repertoire (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         UUID NOT NULL REFERENCES app_group(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  composer         TEXT,
  music_key        TEXT,
  tempo_bpm        INTEGER CHECK (tempo_bpm BETWEEN 20 AND 300),
  performance_date DATE,
  notes            TEXT,
  links            TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE section (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repertoire_id  UUID NOT NULL REFERENCES repertoire(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  measure_start  INTEGER,
  measure_end    INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE repertoire_part (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repertoire_id UUID NOT NULL REFERENCES repertoire(id) ON DELETE CASCADE,
  nucleus_id    UUID REFERENCES nucleus(id),
  label         TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE track (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repertoire_id UUID NOT NULL REFERENCES repertoire(id) ON DELETE CASCADE,
  label         TEXT NOT NULL,
  storage_path  TEXT NOT NULL,
  ordering      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE task (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID NOT NULL REFERENCES app_group(id) ON DELETE CASCADE,
  repertoire_id UUID NOT NULL REFERENCES repertoire(id),
  section_id    UUID REFERENCES section(id),
  scope         TEXT NOT NULL CHECK (scope IN ('grupo','nucleo','categoria','membro','papel')),
  target_id     TEXT,
  guidance      TEXT,
  due_date      DATE,
  status        task_status NOT NULL DEFAULT 'pendente',
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE submission (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id      UUID NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id),
  type         submission_type NOT NULL,
  storage_path TEXT,
  link_url     TEXT,
  text_content TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES submission(id) ON DELETE CASCADE,
  reviewer_id   UUID NOT NULL REFERENCES auth.users(id),
  type          feedback_type NOT NULL,
  comment       TEXT,
  storage_path  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE readiness_state (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repertoire_id UUID NOT NULL REFERENCES repertoire(id) ON DELETE CASCADE,
  section_id    UUID REFERENCES section(id) ON DELETE CASCADE,
  level         NUMERIC(4,3) NOT NULL DEFAULT 0 CHECK (level BETWEEN 0 AND 1),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, repertoire_id, section_id)
);

CREATE TABLE community_post (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES app_group(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  nucleus_id UUID REFERENCES nucleus(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE community_reply (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES community_post(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE xp_event (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  group_id   UUID NOT NULL REFERENCES app_group(id),
  event_type TEXT NOT NULL,
  points     INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE development_track (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id),
  group_id   UUID NOT NULL REFERENCES app_group(id),
  notes      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE rehearsal (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES app_group(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id),
  action        TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id   TEXT,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE access_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  resource_type TEXT NOT NULL,
  resource_id   TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ON membership(group_id);
CREATE INDEX ON membership(user_id);
CREATE INDEX ON repertoire(group_id);
CREATE INDEX ON repertoire_part(repertoire_id);
CREATE INDEX ON task(group_id);
CREATE INDEX ON submission(task_id);
CREATE INDEX ON access_log(resource_type, resource_id);

-- Enable RLS on all tables
ALTER TABLE organization        ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_group           ENABLE ROW LEVEL SECURITY;
ALTER TABLE nucleus              ENABLE ROW LEVEL SECURITY;
ALTER TABLE category             ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile              ENABLE ROW LEVEL SECURITY;
ALTER TABLE membership           ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertoire           ENABLE ROW LEVEL SECURITY;
ALTER TABLE section              ENABLE ROW LEVEL SECURITY;
ALTER TABLE repertoire_part      ENABLE ROW LEVEL SECURITY;
ALTER TABLE track                ENABLE ROW LEVEL SECURITY;
ALTER TABLE task                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE submission           ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback             ENABLE ROW LEVEL SECURITY;
ALTER TABLE readiness_state      ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post       ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_reply      ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_event             ENABLE ROW LEVEL SECURITY;
ALTER TABLE development_track    ENABLE ROW LEVEL SECURITY;
ALTER TABLE rehearsal            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_log           ENABLE ROW LEVEL SECURITY;
