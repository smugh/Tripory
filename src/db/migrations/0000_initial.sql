-- Tripory Database Migration 0000: Initial Schema
-- Mendukung offline-first, local SQLite dengan relasi terindeks

CREATE TABLE IF NOT EXISTS trips (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  duration_days INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft',
  cover_photo_path TEXT,
  notes TEXT,
  is_archived INTEGER NOT NULL DEFAULT 0,
  has_missing_items INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trips_status ON trips (status);
CREATE INDEX IF NOT EXISTS idx_trips_start_date ON trips (start_date);

CREATE TABLE IF NOT EXISTS destinations (
  id TEXT PRIMARY KEY NOT NULL,
  trip_id TEXT NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  day_number INTEGER NOT NULL DEFAULT 1,
  order_index INTEGER NOT NULL DEFAULT 0,
  planned_time TEXT,
  activity TEXT,
  location_label TEXT,
  latitude REAL,
  longitude REAL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_destinations_trip_id ON destinations (trip_id);
CREATE INDEX IF NOT EXISTS idx_destinations_day_order ON destinations (day_number, order_index);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_category ON items (category);

CREATE TABLE IF NOT EXISTS trip_items (
  id TEXT PRIMARY KEY NOT NULL,
  trip_id TEXT NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  item_id TEXT REFERENCES items (id) ON DELETE SET NULL,
  custom_name TEXT NOT NULL,
  category TEXT NOT NULL,
  planned_destination_id TEXT REFERENCES destinations (id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'planned',
  priority TEXT NOT NULL DEFAULT 'must_have',
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trip_items_trip_id ON trip_items (trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_items_state ON trip_items (state);
CREATE INDEX IF NOT EXISTS idx_trip_items_planned_dest ON trip_items (planned_destination_id);

CREATE TABLE IF NOT EXISTS destination_usages (
  id TEXT PRIMARY KEY NOT NULL,
  destination_id TEXT NOT NULL REFERENCES destinations (id) ON DELETE CASCADE,
  trip_item_id TEXT NOT NULL REFERENCES trip_items (id) ON DELETE CASCADE,
  used_at TEXT NOT NULL,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_dest_usages_dest_id ON destination_usages (destination_id);
CREATE INDEX IF NOT EXISTS idx_dest_usages_item_id ON destination_usages (trip_item_id);

CREATE TABLE IF NOT EXISTS moments (
  id TEXT PRIMARY KEY NOT NULL,
  trip_id TEXT NOT NULL REFERENCES trips (id) ON DELETE CASCADE,
  destination_id TEXT REFERENCES destinations (id) ON DELETE SET NULL,
  caption TEXT,
  photo_path TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_moments_trip_id ON moments (trip_id);
CREATE INDEX IF NOT EXISTS idx_moments_dest_id ON moments (destination_id);

CREATE TABLE IF NOT EXISTS app_metadata (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
