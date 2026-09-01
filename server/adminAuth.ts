import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { auditLogger } from './auditLogger.js';

interface AdminSessionPayload {
  role: 'admin';
  createdAt: number;
  expiresAt: number;
  ip: string;
  userAgent?: string;
  nonce: string;
}

class AdminAuthManager {
  private inMemoryRevokedTokens: Set<string> = new Set();
  private activeSessions: Map<string, AdminSessionPayload> = new Map();
  private sessionDurationMs = 24 * 60 * 60 * 1000; // 24 hours
  private signingSecret: Buffer;

  constructor() {
    // Generate deterministic signing secret from environment or fallback
    const seed = process.env.ADMIN_JWT_SECRET || process.env.ADMIN_PASSWORD || process.env.VAULT_ENCRYPTION_SECRET || 'TELEGRAM-ADMIN-SESSION-SECRET-SEED-2026';
    this.signingSecret = crypto.createHash('sha256').update(seed).digest();
  }

  public createSession(ip: string, userAgent?: string): string {
    const now = Date.now();
    const payload: AdminSessionPayload = {
      role: 'admin',
      createdAt: now,
      expiresAt: now + this.sessionDurationMs,
      ip,
      userAgent: userAgent ? userAgent.slice(0, 120) : undefined,
      nonce: crypto.randomBytes(8).toString('hex'),
    };

    const payloadJson = JSON.stringify(payload);
    const payloadB64 = Buffer.from(payloadJson, 'utf-8').toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.signingSecret)
      .update(payloadB64)
      .digest('base64url');

    const token = `tgadm.${payloadB64}.${signature}`;
    this.activeSessions.set(token, payload);
    return token;
  }

  public validateToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;

    // Check if explicitly revoked
    if (this.inMemoryRevokedTokens.has(token)) {
      return false;
    }

    // Handle stateless signed tokens (tgadm.<payloadB64>.<sig>)
    if (token.startsWith('tgadm.')) {
      const parts = token.split('.');
      if (parts.length === 3) {
        const [, payloadB64, sig] = parts;
        try {
          // Recompute HMAC signature
          const expectedSig = crypto
            .createHmac('sha256', this.signingSecret)
            .update(payloadB64)
            .digest('base64url');

          const expectedBuf = Buffer.from(expectedSig);
          const actualBuf = Buffer.from(sig);

          if (expectedBuf.length !== actualBuf.length) {
            return false;
          }

          if (!crypto.timingSafeEqual(expectedBuf, actualBuf)) {
            return false;
          }

          // Parse payload and check expiry
          const payloadJson = Buffer.from(payloadB64, 'base64url').toString('utf-8');
          const payload: AdminSessionPayload = JSON.parse(payloadJson);

          if (payload.role !== 'admin') {
            return false;
          }

          if (!payload.expiresAt || payload.expiresAt < Date.now()) {
            return false;
          }

          return true;
        } catch {
          return false;
        }
      }
    }

    // Legacy in-memory token fallback
    const memSession = this.activeSessions.get(token);
    if (memSession) {
      if (memSession.expiresAt < Date.now()) {
        this.activeSessions.delete(token);
        return false;
      }
      return true;
    }

    return false;
  }

  public getActiveSessionCount(): number {
    return Math.max(1, this.activeSessions.size);
  }

  public revokeSession(token: string): void {
    this.inMemoryRevokedTokens.add(token);
    this.activeSessions.delete(token);
  }

  public revokeAllSessions(): void {
    this.activeSessions.clear();
    // Rotate secret effectively revoking all signed tokens
    this.signingSecret = crypto.randomBytes(32);
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        auditLogger.log({
          eventType: 'ADMIN_LOGIN_FAIL',
          severity: 'warn',
          ipAddress: req.ip || req.socket.remoteAddress || '0.0.0.0',
          userAgent: req.headers['user-agent'],
          details: `Unauthorized admin route access attempt to ${req.path}`,
        });
        return res.status(401).json({
          error: 'Unauthorized: Valid Admin Session Token required',
          code: 'AUTH_REQUIRED',
        });
      }

      const token = authHeader.split(' ')[1];
      if (!this.validateToken(token)) {
        return res.status(401).json({
          error: 'Session expired or invalid. Please log in again.',
          code: 'SESSION_EXPIRED',
        });
      }

      next();
    };
  }
}

export const adminAuth = new AdminAuthManager();
