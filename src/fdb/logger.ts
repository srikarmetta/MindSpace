import type { FDBLogEntry, FDBLoggerInterface } from './types';

const SECRET_KEY_PATTERNS = [
  /api[-_]?key/i,
  /secret/i,
  /password/i,
  /token/i,
  /auth/i,
  /bearer/i,
  /credential/i,
  /private[-_]?key/i,
];

export class FDBLogger implements FDBLoggerInterface {
  private logs: FDBLogEntry[] = [];
  private listeners: ((entry: FDBLogEntry) => void)[] = [];

  /**
   * Recursively scrubs any potential API secrets or sensitive credentials
   */
  public sanitize(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (typeof data !== 'object') return data;

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const isSensitiveKey = SECRET_KEY_PATTERNS.some((pat) => pat.test(key));
      if (isSensitiveKey) {
        sanitized[key] = '[REDACTED_SECRET]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitize(value);
      } else if (typeof value === 'string' && (value.startsWith('sk-') || value.startsWith('livekit_'))) {
        sanitized[key] = '[REDACTED_SECRET]';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  public log(entry: Omit<FDBLogEntry, 'timestamp' | 'epochMs'>): void {
    const fullEntry: FDBLogEntry = {
      timestamp: new Date().toISOString(),
      epochMs: Date.now(),
      sessionId: entry.sessionId,
      intentId: entry.intentId,
      toolName: entry.toolName,
      arguments: this.sanitize(entry.arguments),
      operationId: entry.operationId,
      status: entry.status,
      cancellation: Boolean(entry.cancellation),
      supersession: Boolean(entry.supersession),
      latencyMs: entry.latencyMs !== null ? Math.round(entry.latencyMs) : null,
    };

    this.logs.push(fullEntry);
    this.listeners.forEach((l) => l(fullEntry));
  }

  public getLogs(sessionId?: string): FDBLogEntry[] {
    if (sessionId) {
      return this.logs.filter((l) => l.sessionId === sessionId);
    }
    return [...this.logs];
  }

  public exportJSONL(sessionId?: string): string {
    const targetLogs = this.getLogs(sessionId);
    return targetLogs.map((l) => JSON.stringify(l)).join('\n');
  }

  public clear(): void {
    this.logs = [];
  }

  public onLog(callback: (entry: FDBLogEntry) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }
}

export const fdbLogger = new FDBLogger();
