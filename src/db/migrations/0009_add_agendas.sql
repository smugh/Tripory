CREATE TABLE IF NOT EXISTS agendas (
  id TEXT PRIMARY KEY NOT NULL,
  agenda_type TEXT NOT NULL CHECK (agenda_type IN ('shopping', 'short_trip', 'event')),
  title TEXT NOT NULL,
  date TEXT,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'saved')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  closed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_agendas_status_date ON agendas (status, date);

CREATE TABLE IF NOT EXISTS agenda_items (
  id TEXT PRIMARY KEY NOT NULL,
  agenda_id TEXT NOT NULL REFERENCES agendas(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  unit TEXT,
  is_done INTEGER NOT NULL DEFAULT 0,
  estimated_price INTEGER,
  shelf_price INTEGER,
  actual_price INTEGER,
  notes TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agenda_items_agenda_order ON agenda_items (agenda_id, order_index);
