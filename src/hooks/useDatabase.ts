import { useState, useEffect, useCallback } from 'react';
import { runMigrations } from '@/db/migrations/migrator';
import { AppInitializationState } from '@/types';
import { logger } from '@/core/utils';

export function useDatabase(): AppInitializationState {
  const [state, setState] = useState<AppInitializationState>({
    isDatabaseReady: false,
    schemaVersion: 0,
    error: null,
  });
  const [reloadTrigger, setReloadTrigger] = useState(0);

  const retry = useCallback(() => {
    setState({
      isDatabaseReady: false,
      schemaVersion: 0,
      error: null,
    });
    setReloadTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      try {
        const result = await runMigrations();
        if (isMounted) {
          if (result.success) {
            setState({
              isDatabaseReady: true,
              schemaVersion: result.currentVersion,
              error: null,
              retry,
            });
          } else {
            setState({
              isDatabaseReady: false,
              schemaVersion: -1,
              error: 'Gagal menginisialisasi skema database SQLite.',
              retry,
            });
          }
        }
      } catch (err) {
        logger.error('Error saat inisialisasi database', {
          category: 'db',
          error: err instanceof Error ? err.message : String(err),
        });
        if (isMounted) {
          setState({
            isDatabaseReady: false,
            schemaVersion: -1,
            error: err instanceof Error ? err.message : 'Unknown database error',
            retry,
          });
        }
      }
    }

    initialize();

    return () => {
      isMounted = false;
    };
  }, [reloadTrigger, retry]);

  return { ...state, retry };
}
