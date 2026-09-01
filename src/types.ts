export type PremiumPlan = '1_month' | '3_months' | '6_months' | '12_months';

export type CDKStatus = 'active' | 'redeemed' | 'revoked' | 'expired';

export interface CDKItem {
  id: string;
  code: string;
  plan: PremiumPlan;
  planDurationDays: number;
  giftType: string;
  status: CDKStatus;
  createdAt: string;
  expiresAt?: string;
  claimedAt?: string;
  claimedByUsername?: string;
  claimedIp?: string;
  notes?: string;
  batchId?: string;
}

export type AuditSeverity = 'info' | 'warn' | 'security_alert' | 'critical';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  eventType: string;
  severity: AuditSeverity;
  ipAddress: string;
  userAgent?: string;
  telegramUsername?: string;
  cdkMasked?: string;
  details: string;
  metadata?: Record<string, any>;
}

export interface SecurityHealthData {
  encryption: {
    algorithm: string;
    ivLengthBits: number;
    authTagLengthBits: number;
    keyDerivation: string;
    vaultPath: string;
    isEncryptedAtRest: boolean;
    lastPersisted: string;
  };
  blockedIps: Array<{
    ip: string;
    failedAttempts: number;
    unblockInSeconds: number;
  }>;
  totalAuditLogs: number;
  totalCDKs: number;
  serverTime: string;
  nodeVersion: string;
  platform: string;
  settings: {
    rateLimitMaxAttempts: number;
    rateLimitWindowMinutes: number;
    supportTelegramContact: string;
    customBannerText?: string;
  };
}

export interface VerificationResult {
  valid: boolean;
  maskedCode: string;
  plan: PremiumPlan;
  planDurationDays: number;
  giftType: string;
  expiresAt?: string;
}

export interface ActivationResult {
  success: boolean;
  activationReceiptId: string;
  plan: PremiumPlan;
  planDurationDays: number;
  telegramUsername: string;
  claimedAt: string;
  giftPayload: string;
  giftType: string;
  instructions: string;
}

export interface PublicSystemStatus {
  status: string;
  securityStatus: string;
  isRateLimited: boolean;
  remainingAttempts: number;
  supportContact: string;
  bannerText?: string;
}
