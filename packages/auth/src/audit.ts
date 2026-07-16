import { appendFile, mkdir } from 'node:fs/promises';

export interface AuditEntry {
  timestamp: string;
  action: string;
  userId?: string;
  ip?: string;
  method?: string;
  path?: string;
  status?: number;
  metadata?: Record<string, unknown>;
}

export interface AuditLoggerOptions {
  /** Log file path (default: '.pledge/audit.log') */
  filePath?: string;
  /** Also log to console (default: true in dev) */
  console?: boolean;
  /** Max file size before rotation in bytes (default: 10MB) */
  maxFileSize?: number;
}

export class AuditLogger {
  private filePath: string;
  private logToConsole: boolean;
  private initialized = false;

  constructor(options: AuditLoggerOptions = {}) {
    this.filePath = options.filePath ?? '.pledge/audit.log';
    this.logToConsole = options.console ?? process.env.NODE_ENV !== 'production';
  }

  async log(entry: Omit<AuditEntry, 'timestamp'>): Promise<void> {
    const fullEntry: AuditEntry = {
      timestamp: new Date().toISOString(),
      ...entry,
    };

    const line = JSON.stringify(fullEntry) + '\n';

    if (this.logToConsole) {
      console.log(`[audit] ${line.trim()}`);
    }

    try {
      if (!this.initialized) {
        const dir = this.filePath.split('/').slice(0, -1).join('/');
        if (dir) await mkdir(dir, { recursive: true });
        this.initialized = true;
      }
      await appendFile(this.filePath, line);
    } catch {
      /* ignore file errors */
    }
  }

  async logServerAction(action: string, userId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({ action: `server-action:${action}`, userId, metadata });
  }

  async logAuth(action: 'login' | 'logout' | 'failed' | 'signup', userId?: string, ip?: string): Promise<void> {
    await this.log({ action: `auth:${action}`, userId, ip });
  }

  async logRequest(method: string, path: string, status: number, userId?: string, ip?: string): Promise<void> {
    await this.log({ action: 'request', method, path, status, userId, ip });
  }
}

let defaultLogger: AuditLogger | null = null;

export function getDefaultAuditLogger(): AuditLogger {
  if (!defaultLogger) {
    defaultLogger = new AuditLogger();
  }
  return defaultLogger;
}
