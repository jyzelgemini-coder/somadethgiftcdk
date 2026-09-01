export type PremiumPlan = '1_month' | '3_months' | '6_months' | '12_months';

export type CDKStatus = 'active' | 'redeemed' | 'revoked' | 'expired';

export interface CDKRecord {
  id: string;
  code: string; // The formatted CDK, e.g. TGPREM-XXXX-XXXX-XXXX
  codeHash: string; // SHA-256 hash for fast constant-time lookup
  plan: PremiumPlan;
  planDurationDays: number;
  giftType: 'telegram_gift_link' | 'premium_code' | 'bot_voucher';
  encryptedGiftPayload: string; // AES-256-GCM encrypted payload
  giftIv: string;
  giftAuthTag: string;
  status: CDKStatus;
  createdAt: string;
  expiresAt?: string;
  claimedAt?: string;
  claimedByUsername?: string;
  claimedIp?: string;
  claimedUserAgent?: string;
  notes?: string;
  batchId?: string;
}

export type AuditSeverity = 'info' | 'warn' | 'security_alert' | 'critical';

export type AuditEventType =
  | 'ADMIN_LOGIN_SUCCESS'
  | 'ADMIN_LOGIN_FAIL'
  | 'ADMIN_LOGOUT'
  | 'ADMIN_PASSWORD_CHANGED'
  | 'CDK_CREATED'
  | 'CDK_BATCH_CREATED'
  | 'CDK_REVOKED'
  | 'CDK_DELETED'
  | 'CDK_VERIFICATION_SUCCESS'
  | 'CDK_VERIFICATION_FAIL'
  | 'CDK_ACTIVATION_SUCCESS'
  | 'CDK_ACTIVATION_FAIL'
  | 'RATE_LIMIT_BLOCKED'
  | 'VAULT_BACKUP_EXPORTED'
  | 'VAULT_BACKUP_IMPORTED'
  | 'VAULT_RE_ENCRYPTED'
  | 'SUSPICIOUS_ACTIVITY';

export interface AuditLogRecord {
  id: string;
  timestamp: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  ipAddress: string;
  userAgent?: string;
  telegramUsername?: string;
  cdkMasked?: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface AdminSettings {
  passwordHash: string;
  passwordSalt: string;
  rateLimitMaxAttempts: number;
  rateLimitWindowMinutes: number;
  supportTelegramContact: string;
  requireUsernameVerification: boolean;
  enableAuditIpTracking: boolean;
  customBannerText?: string;
}

export interface EncryptedDatabaseFile {
  version: number;
  encryptedData: string; // AES-256-GCM cipher text
  iv: string;
  authTag: string;
  checksum: string; // SHA-256 hash of plaintext for integrity check
  lastModified: string;
}

export interface VaultPlaintextData {
  cdks: CDKRecord[];
  auditLogs: AuditLogRecord[];
  settings: AdminSettings;
}
