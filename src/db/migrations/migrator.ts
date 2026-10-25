import { getNativeDatabase } from '../client';
import { logger } from '@/core/utils';

export interface MigrationStep {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: MigrationStep[] = [
  {
    version: 1,
    name: '0000_initial_schema',
    sql: `
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
        image_uri TEXT,
        notes TEXT,
        todos TEXT,
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
    `,
  },
  {
    version: 2,
    name: '0001_add_moment_location_tags',
    sql: `
      ALTER TABLE moments ADD COLUMN location_name TEXT;
      ALTER TABLE moments ADD COLUMN latitude REAL;
      ALTER TABLE moments ADD COLUMN longitude REAL;
    `,
  },
  {
    version: 3,
    name: '0002_add_destination_details',
    sql: `
      ALTER TABLE destinations ADD COLUMN image_uri TEXT;
      ALTER TABLE destinations ADD COLUMN notes TEXT;
      ALTER TABLE destinations ADD COLUMN todos TEXT;
    `,
  },
  {
    version: 4,
    name: '0003_add_item_image_uri',
    sql: `
      ALTER TABLE items ADD COLUMN image_uri TEXT;
    `,
  },
  {
    version: 5,
    name: '0004_add_destination_visited_state',
    sql: `
      ALTER TABLE destinations ADD COLUMN is_visited INTEGER NOT NULL DEFAULT 0;
    `,
  },
  {
    version: 6,
    name: '0005_preserve_completed_trip_archive',
    sql: `
      CREATE TABLE IF NOT EXISTS item_events (
        id TEXT PRIMARY KEY NOT NULL,
        trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        trip_item_id TEXT NOT NULL REFERENCES trip_items(id) ON DELETE CASCADE,
        destination_id TEXT REFERENCES destinations(id) ON DELETE SET NULL,
        state TEXT NOT NULL,
        occurred_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_item_events_trip ON item_events(trip_id, occurred_at);
      CREATE TABLE IF NOT EXISTS trip_archives (
        trip_id TEXT PRIMARY KEY NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        payload TEXT NOT NULL,
        closed_at TEXT NOT NULL
      );
      CREATE TRIGGER IF NOT EXISTS lock_completed_trip
      BEFORE UPDATE ON trips WHEN OLD.status = 'completed'
      BEGIN SELECT RAISE(ABORT, 'Completed trips are read-only'); END;
      CREATE TRIGGER IF NOT EXISTS lock_trip_archive
      BEFORE UPDATE ON trip_archives
      BEGIN SELECT RAISE(ABORT, 'Trip archives are read-only'); END;
    `,
  },
  {
    version: 7,
    name: '0006_add_destination_planned_date',
    sql: `ALTER TABLE destinations ADD COLUMN planned_date TEXT;`,
  },
  {
    version: 8,
    name: '0007_remove_plans_without_deleting_memories',
    sql: `CREATE TABLE IF NOT EXISTS planning_removals (
      trip_id TEXT PRIMARY KEY NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      removed_at TEXT NOT NULL
    );`,
  },
  {
    version: 9,
    name: '0008_add_item_grouping_and_album_customizations',
    sql: `
      ALTER TABLE items ADD COLUMN parent_id TEXT;
      ALTER TABLE items ADD COLUMN is_group INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE trip_items ADD COLUMN parent_id TEXT;
      ALTER TABLE trip_items ADD COLUMN is_group INTEGER NOT NULL DEFAULT 0;
      CREATE TABLE IF NOT EXISTS album_customizations (
        trip_id TEXT PRIMARY KEY NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
        custom_title TEXT,
        custom_notes TEXT,
        custom_cover_path TEXT,
        is_hidden INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_album_customizations_hidden ON album_customizations(is_hidden);
    `,
  },
];

/**
 * Menjalankan migrasi database SQLite secara otomatis dan idempoten pada saat aplikasi dibuka.
 */
export async function runMigrations(): Promise<{ success: boolean; currentVersion: number }> {
  try {
    const db = getNativeDatabase();
    
    // Pastikan tabel metadata selalu ada
    db.execSync(`
      CREATE TABLE IF NOT EXISTS app_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Baca versi schema saat ini
    const versionRow = db.getFirstSync<{ value: string }>(
      "SELECT value FROM app_metadata WHERE key = 'schema_version';"
    );
    const currentVersion = versionRow ? parseInt(versionRow.value, 10) : 0;

    logger.info(`Memeriksa migrasi database. Versi lokal saat ini: v${currentVersion}`, { category: 'db' });

    let appliedVersion = currentVersion;
    for (const step of MIGRATIONS) {
      if (step.version > currentVersion) {
        logger.info(`Menerapkan migrasi v${step.version}: ${step.name}`, { category: 'db' });
        try {
          db.execSync(step.sql);
        } catch (migrationErr: any) {
          if (migrationErr?.message?.includes('duplicate column name')) {
            logger.warn(`Kolom sudah ada pada migrasi v${step.version}, dilewati dengan aman: ${migrationErr.message}`, { category: 'db' });
          } else {
            throw migrationErr;
          }
        }
        
        db.runSync(
          `INSERT INTO app_metadata (key, value, updated_at) 
           VALUES ('schema_version', ?, ?) 
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
          [step.version.toString(), new Date().toISOString()]
        );
        appliedVersion = step.version;
      }
    }

    logger.info(`Database migrasi siap. Versi aktif: v${appliedVersion}`, { category: 'db' });
    return { success: true, currentVersion: appliedVersion };
  } catch (error) {
    logger.error('Gagal menjalankan migrasi SQLite', {
      category: 'db',
      error: error instanceof Error ? error.message : String(error),
    });
    return { success: false, currentVersion: -1 };
  }
}
