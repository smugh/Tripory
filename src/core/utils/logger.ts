/**
 * Bounded Diagnostic Logger
 * Mematuhi prinsip arsitektur Tripory: mencatat kejadian diagnostik tanpa merekam data personal pengguna secara berlebihan.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  category?: 'db' | 'media' | 'trip' | 'packing' | 'closure' | 'location' | 'general';
  [key: string]: unknown;
}

class DiagnosticLogger {
  private isDev = process.env.EXPO_PUBLIC_ENABLE_DEV_LOGS !== 'false';

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (!this.isDev && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const tag = `[Tripory:${context?.category ?? 'app'}]`;

    switch (level) {
      case 'error':
        console.error(`${timestamp} ${tag} ERROR: ${message}`, context ? sanitizeContext(context) : '');
        break;
      case 'warn':
        console.warn(`${timestamp} ${tag} WARN: ${message}`, context ? sanitizeContext(context) : '');
        break;
      case 'info':
        console.info(`${timestamp} ${tag} INFO: ${message}`);
        break;
      case 'debug':
        console.log(`${timestamp} ${tag} DEBUG: ${message}`);
        break;
    }
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext) {
    this.log('error', message, context);
  }
}

function sanitizeContext(ctx: LogContext): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    // Hindari logging teks sensitif atau data foto
    if (k.toLowerCase().includes('password') || k.toLowerCase().includes('token') || k.toLowerCase().includes('base64')) {
      safe[k] = '[REDACTED]';
    } else {
      safe[k] = v;
    }
  }
  return safe;
}

export const logger = new DiagnosticLogger();
