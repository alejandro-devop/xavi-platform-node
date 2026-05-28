-- ============================================================
-- 026 - Sweeter Way module tables
-- ============================================================

CREATE TYPE sw_bond_status AS ENUM ('pending', 'accepted', 'rejected', 'dissolved');
CREATE TYPE sw_list_category AS ENUM ('restaurant', 'travel', 'outdoor', 'entertainment', 'culture', 'other');
CREATE TYPE sw_item_status AS ENUM ('pending', 'completed');
CREATE TYPE sw_notification_type AS ENUM ('bond_requested', 'bond_accepted', 'item_added', 'item_completed', 'log_added');
CREATE TYPE sw_entity_type AS ENUM ('bond', 'list', 'item', 'log');

-- Vínculo entre dos usuarios (pareja)
CREATE TABLE sw_cinnamon_bonds (
  id             UUID PRIMARY KEY DEFAULT generate_uuidv7(),
  requester_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status         sw_bond_status NOT NULL DEFAULT 'pending',
  requested_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  responded_at   TIMESTAMP,
  created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT sw_cinnamon_bonds_no_self_bond CHECK (requester_id != addressee_id)
);

-- Un usuario no puede tener más de un bond aceptado a la vez
CREATE UNIQUE INDEX sw_bonds_unique_requester_accepted
  ON sw_cinnamon_bonds (requester_id) WHERE status = 'accepted';
CREATE UNIQUE INDEX sw_bonds_unique_addressee_accepted
  ON sw_cinnamon_bonds (addressee_id) WHERE status = 'accepted';

-- Listas compartidas de la pareja
CREATE TABLE sw_lists (
  id          UUID PRIMARY KEY DEFAULT generate_uuidv7(),
  bond_id     UUID NOT NULL REFERENCES sw_cinnamon_bonds(id) ON DELETE CASCADE,
  title       VARCHAR(100) NOT NULL,
  description TEXT,
  category    sw_list_category NOT NULL DEFAULT 'other',
  created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Elementos dentro de una lista
CREATE TABLE sw_list_items (
  id           UUID PRIMARY KEY DEFAULT generate_uuidv7(),
  list_id      UUID NOT NULL REFERENCES sw_lists(id) ON DELETE CASCADE,
  title        VARCHAR(100) NOT NULL,
  description  TEXT,
  address      TEXT,
  url          TEXT,
  status       sw_item_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMP,
  added_by     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating       INTEGER CHECK (rating >= 1 AND rating <= 5),
  would_return BOOLEAN,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Log emocional por elemento completado (uno por usuario por ítem)
CREATE TABLE sw_item_logs (
  id         UUID PRIMARY KEY DEFAULT generate_uuidv7(),
  item_id    UUID NOT NULL REFERENCES sw_list_items(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment    TEXT,
  liked      BOOLEAN,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (item_id, user_id)
);

-- Notificaciones in-app del módulo
CREATE TABLE sw_notifications (
  id           UUID PRIMARY KEY DEFAULT generate_uuidv7(),
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         sw_notification_type NOT NULL,
  entity_type  sw_entity_type NOT NULL,
  entity_id    UUID NOT NULL,
  read_at      TIMESTAMP,
  payload      JSONB,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Preferencias de notificación por usuario
CREATE TABLE sw_user_preferences (
  id                       UUID PRIMARY KEY DEFAULT generate_uuidv7(),
  user_id                  INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  email_notifications      BOOLEAN NOT NULL DEFAULT TRUE,
  in_app_notifications     BOOLEAN NOT NULL DEFAULT TRUE,
  push_token               TEXT,
  push_notifications_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at               TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMP NOT NULL DEFAULT NOW()
);
