import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';
import { APP_CONFIG } from '@/core/constants';
import { logger } from '@/core/utils';

let expoDatabaseInstance: SQLite.SQLiteDatabase | null = null;
let drizzleInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Mendapatkan koneksi native SQLite dari expo-sqlite
 */
export function getNativeDatabase(): SQLite.SQLiteDatabase {
  if (!expoDatabaseInstance) {
    const dbName = process.env.EXPO_PUBLIC_DATABASE_NAME || APP_CONFIG.defaultDbName;
    logger.info(`Membuka database SQLite: ${dbName}`, { category: 'db' });
    expoDatabaseInstance = SQLite.openDatabaseSync(dbName);
    
    // Aktifkan Foreign Keys dan WAL mode untuk integritas & performa
    expoDatabaseInstance.execSync('PRAGMA foreign_keys = ON;');
    expoDatabaseInstance.execSync('PRAGMA journal_mode = WAL;');
  }
  return expoDatabaseInstance;
}

/**
 * Mendapatkan instance Drizzle ORM
 */
export function getDb() {
  if (!drizzleInstance) {
    const nativeDb = getNativeDatabase();
    drizzleInstance = drizzle(nativeDb, { schema });
  }
  return drizzleInstance;
}

/**
 * Shorthand exported db client dengan proxy lazy-init
 */
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop: string | symbol) {
    const instance = getDb();
    const val = (instance as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') {
      return val.bind(instance);
    }
    return val;
  },
});
