import crypto from 'crypto';
import { vault } from './cryptoVault.js';
import { AuditEventType, AuditLogRecord, AuditSeverity } from './types.js';

class AuditLogger {
  public log(params: {
    eventType: AuditEventType;
    severity?: AuditSeverity;
    ipAddress?: string;
    userAgent?: string;
    telegramUsername?: string;
    cdkMasked?: string;
    details: string;
    metadata?: Record<string, any>;
  }): AuditLogRecord {
    const data = vault.getData();

    const record: AuditLogRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: params.eventType,
      severity: params.severity || 'info',
      ipAddress: params.ipAddress || '0.0.0.0',
      userAgent: params.userAgent || 'Unknown Agent',
      telegramUsername: params.telegramUsername,
      cdkMasked: params.cdkMasked,
      details: params.details,
      metadata: params.metadata,
    };

    // Prepend to list for latest first, cap to last 2,000 logs
    data.auditLogs.unshift(record);
    if (data.auditLogs.length > 2000) {
      data.auditLogs = data.auditLogs.slice(0, 2000);
    }

    vault.persistVault();
    return record;
  }

  public getLogs(filter?: {
    severity?: string;
    eventType?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }): { logs: AuditLogRecord[]; total: number } {
    const data = vault.getData();
    let filtered = [...data.auditLogs];

    if (filter?.severity && filter.severity !== 'all') {
      filtered = filtered.filter((l) => l.severity === filter.severity);
    }

    if (filter?.eventType && filter.eventType !== 'all') {
      filtered = filtered.filter((l) => l.eventType === filter.eventType);
    }

    if (filter?.search && filter.search.trim()) {
      const q = filter.search.trim().toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.details.toLowerCase().includes(q) ||
          l.eventType.toLowerCase().includes(q) ||
          l.ipAddress.toLowerCase().includes(q) ||
          (l.telegramUsername && l.telegramUsername.toLowerCase().includes(q)) ||
          (l.cdkMasked && l.cdkMasked.toLowerCase().includes(q))
      );
    }

    const total = filtered.length;
    const limit = filter?.limit || 50;
    const offset = filter?.offset || 0;
    const paginated = filtered.slice(offset, offset + limit);

    return { logs: paginated, total };
  }

  public clearLogs(): void {
    const data = vault.getData();
    data.auditLogs = [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'VAULT_RE_ENCRYPTED',
        severity: 'warn',
        ipAddress: 'System',
        details: 'Audit logs cleared and rotated by administrator.',
      },
    ];
    vault.persistVault();
  }
}

export const auditLogger = new AuditLogger();
