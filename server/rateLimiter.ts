import { auditLogger } from './auditLogger.js';

interface RateLimitEntry {
  failedAttempts: number;
  firstAttemptTime: number;
  lastAttemptTime: number;
  blockedUntil: number | null;
}

class RateLimiter {
  private attempts: Map<string, RateLimitEntry> = new Map();
  private maxFailedAttempts = 5;
  private windowDurationMs = 15 * 60 * 1000; // 15 minutes
  private blockDurationMs = 15 * 60 * 1000; // 15 minutes lock on violation

  constructor() {
    // Periodic garbage collection of expired entries every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  public setConfig(maxAttempts: number, windowMinutes: number) {
    this.maxFailedAttempts = Math.max(1, maxAttempts);
    this.windowDurationMs = Math.max(1, windowMinutes) * 60 * 1000;
    this.blockDurationMs = this.windowDurationMs;
  }

  public checkLimit(ip: string): { isBlocked: boolean; retryAfterSeconds: number; remainingAttempts: number } {
    const now = Date.now();
    const entry = this.attempts.get(ip);

    if (!entry) {
      return { isBlocked: false, retryAfterSeconds: 0, remainingAttempts: this.maxFailedAttempts };
    }

    if (entry.blockedUntil && entry.blockedUntil > now) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      return { isBlocked: true, retryAfterSeconds: retryAfter, remainingAttempts: 0 };
    }

    // Reset if window has elapsed
    if (now - entry.firstAttemptTime > this.windowDurationMs) {
      this.attempts.delete(ip);
      return { isBlocked: false, retryAfterSeconds: 0, remainingAttempts: this.maxFailedAttempts };
    }

    const remaining = Math.max(0, this.maxFailedAttempts - entry.failedAttempts);
    return { isBlocked: false, retryAfterSeconds: 0, remainingAttempts: remaining };
  }

  public recordFailure(ip: string, userAgent?: string, context?: string): { isNowBlocked: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    let entry = this.attempts.get(ip);

    if (!entry || now - entry.firstAttemptTime > this.windowDurationMs) {
      entry = {
        failedAttempts: 1,
        firstAttemptTime: now,
        lastAttemptTime: now,
        blockedUntil: null,
      };
    } else {
      entry.failedAttempts += 1;
      entry.lastAttemptTime = now;
    }

    let isNowBlocked = false;
    let retryAfterSeconds = 0;

    if (entry.failedAttempts >= this.maxFailedAttempts) {
      entry.blockedUntil = now + this.blockDurationMs;
      isNowBlocked = true;
      retryAfterSeconds = Math.ceil(this.blockDurationMs / 1000);

      auditLogger.log({
        eventType: 'RATE_LIMIT_BLOCKED',
        severity: 'security_alert',
        ipAddress: ip,
        userAgent,
        details: `IP ${ip} temporarily banned for ${this.maxFailedAttempts} consecutive failed attempts (${context || 'CDK Verification'}). Blocked for 15 minutes.`,
      });
    }

    this.attempts.set(ip, entry);
    return { isNowBlocked, retryAfterSeconds };
  }

  public recordSuccess(ip: string): void {
    // Reset failed counter on successful action
    this.attempts.delete(ip);
  }

  public getBlockedList(): Array<{ ip: string; failedAttempts: number; unblockInSeconds: number }> {
    const now = Date.now();
    const list: Array<{ ip: string; failedAttempts: number; unblockInSeconds: number }> = [];

    for (const [ip, entry] of this.attempts.entries()) {
      if (entry.blockedUntil && entry.blockedUntil > now) {
        list.push({
          ip,
          failedAttempts: entry.failedAttempts,
          unblockInSeconds: Math.ceil((entry.blockedUntil - now) / 1000),
        });
      }
    }
    return list;
  }

  public unblockIp(ip: string): boolean {
    if (this.attempts.has(ip)) {
      this.attempts.delete(ip);
      return true;
    }
    return false;
  }

  public unblock(ip: string): boolean {
    return this.unblockIp(ip);
  }

  public getStats(): { totalTrackedIPs: number; activeBlocks: number; windowMinutes: number; maxAttempts: number } {
    const now = Date.now();
    let activeBlocks = 0;
    for (const entry of this.attempts.values()) {
      if (entry.blockedUntil && entry.blockedUntil > now) {
        activeBlocks++;
      }
    }
    return {
      totalTrackedIPs: this.attempts.size,
      activeBlocks,
      windowMinutes: Math.round(this.windowDurationMs / 60000),
      maxAttempts: this.maxFailedAttempts,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [ip, entry] of this.attempts.entries()) {
      const isExpired = !entry.blockedUntil && now - entry.firstAttemptTime > this.windowDurationMs;
      const isUnblocked = entry.blockedUntil && entry.blockedUntil < now;
      if (isExpired || isUnblocked) {
        this.attempts.delete(ip);
      }
    }
  }
}

export const rateLimiter = new RateLimiter();
