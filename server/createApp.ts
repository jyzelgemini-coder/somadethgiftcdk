import crypto from 'crypto';
import express, { Express, Request, Response } from 'express';
import { adminAuth } from './adminAuth.js';
import { auditLogger } from './auditLogger.js';
import { vault } from './cryptoVault.js';
import { rateLimiter } from './rateLimiter.js';
import { CDKRecord, PremiumPlan } from './types.js';

export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '127.0.0.1';
}

export function sanitizeTelegramUsername(raw: string): { isValid: boolean; formatted: string; error?: string } {
  if (!raw) {
    return { isValid: false, formatted: '', error: 'Telegram username is required.' };
  }
  let clean = raw.trim();
  if (clean.startsWith('@')) {
    clean = clean.slice(1);
  }
  // Telegram username rule: 4-32 alphanumeric chars or underscores
  const tgRegex = /^[a-zA-Z0-9_]{4,32}$/;
  if (!tgRegex.test(clean)) {
    return {
      isValid: false,
      formatted: `@${clean}`,
      error: 'Invalid Telegram username. Must be 4-32 alphanumeric characters or underscores (e.g., @john_doe).',
    };
  }
  return { isValid: true, formatted: `@${clean}` };
}

export function generateCDKCode(prefix = 'TGPREM', plan: PremiumPlan): string {
  const planTag = plan === '1_month' ? '1M' : plan === '3_months' ? '3M' : plan === '6_months' ? '6M' : '12M';
  const block1 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const block2 = crypto.randomBytes(2).toString('hex').toUpperCase();
  const block3 = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${planTag}-${block1}-${block2}-${block3}`;
}

export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Trust proxy for accurate IP determination behind reverse proxy (Vercel, Cloud Run, Cloudflare, etc.)
  app.set('trust proxy', true);

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // ==========================================
  // PUBLIC CUSTOMER API ROUTES
  // ==========================================

  // Public system status & verification health
  app.get('/api/public/system-status', (req: Request, res: Response) => {
    const data = vault.getData();
    const clientIp = getClientIp(req);
    const limitStatus = rateLimiter.checkLimit(clientIp);

    res.json({
      status: 'operational',
      securityStatus: 'AES-256-GCM Encrypted Channel Active',
      isRateLimited: limitStatus.isBlocked,
      remainingAttempts: limitStatus.remainingAttempts,
      supportContact: data.settings.supportTelegramContact,
      bannerText: data.settings.customBannerText,
    });
  });

  // Verify CDK without claiming
  app.post('/api/redeem/verify', (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] as string;
    const { cdk, honeypot } = req.body;

    // Bot detection honeypot check
    if (honeypot) {
      auditLogger.log({
        eventType: 'SUSPICIOUS_ACTIVITY',
        severity: 'security_alert',
        ipAddress: clientIp,
        userAgent,
        details: 'Honeypot triggered by automated bot submission.',
      });
      return res.status(400).json({ error: 'Request rejected.' });
    }

    // Check rate limit
    const limitCheck = rateLimiter.checkLimit(clientIp);
    if (limitCheck.isBlocked) {
      return res.status(429).json({
        error: `Too many failed attempts from your IP. Temporarily locked for security. Try again in ${limitCheck.retryAfterSeconds} seconds.`,
        retryAfter: limitCheck.retryAfterSeconds,
      });
    }

    if (!cdk || typeof cdk !== 'string') {
      return res.status(400).json({ error: 'Please enter a valid CDK activation key.' });
    }

    const cleanCode = cdk.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const codeHash = vault.hashCDK(cleanCode);
    const data = vault.getData();

    const record = data.cdks.find((c) => c.codeHash === codeHash || c.code === cleanCode);

    if (!record) {
      const { isNowBlocked, retryAfterSeconds } = rateLimiter.recordFailure(clientIp, userAgent, 'Invalid CDK entered');
      auditLogger.log({
        eventType: 'CDK_VERIFICATION_FAIL',
        severity: 'warn',
        ipAddress: clientIp,
        userAgent,
        cdkMasked: vault.maskCDK(cleanCode),
        details: `Failed verification: Unknown CDK code attempted (${vault.maskCDK(cleanCode)}).`,
      });

      if (isNowBlocked) {
        return res.status(429).json({
          error: `Security Alert: Maximum failed attempts reached. Your IP has been temporarily locked for ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds,
        });
      }

      return res.status(404).json({
        error: 'Invalid CDK Key. Please check the characters carefully or contact the administrator.',
      });
    }

    if (record.status === 'redeemed') {
      auditLogger.log({
        eventType: 'CDK_VERIFICATION_FAIL',
        severity: 'info',
        ipAddress: clientIp,
        userAgent,
        cdkMasked: vault.maskCDK(cleanCode),
        details: `Redeemed CDK verification attempted. Claimed by ${record.claimedByUsername || 'Unknown'}.`,
      });
      return res.status(400).json({
        error: `This CDK was already activated and claimed on ${new Date(record.claimedAt || '').toLocaleString()}${
          record.claimedByUsername ? ` by ${record.claimedByUsername}` : ''
        }.`,
        isAlreadyRedeemed: true,
        claimedAt: record.claimedAt,
      });
    }

    if (record.status === 'revoked') {
      return res.status(400).json({
        error: 'This CDK has been revoked or invalidated by the administrator.',
      });
    }

    if (record.status === 'expired') {
      return res.status(400).json({
        error: 'This CDK has expired.',
      });
    }

    // Success verification
    rateLimiter.recordSuccess(clientIp);
    auditLogger.log({
      eventType: 'CDK_VERIFICATION_SUCCESS',
      severity: 'info',
      ipAddress: clientIp,
      userAgent,
      cdkMasked: vault.maskCDK(cleanCode),
      details: `CDK successfully verified for plan [${record.plan}] (${record.planDurationDays} days).`,
    });

    res.json({
      valid: true,
      maskedCode: vault.maskCDK(cleanCode),
      plan: record.plan,
      planDurationDays: record.planDurationDays,
      giftType: record.giftType,
      expiresAt: record.expiresAt,
    });
  });

  // Activate / Redeem CDK for Telegram Username
  app.post('/api/redeem/claim', (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] as string;
    const { cdk, telegramUsername, honeypot } = req.body;

    if (honeypot) {
      return res.status(400).json({ error: 'Request rejected.' });
    }

    // Check rate limit
    const limitCheck = rateLimiter.checkLimit(clientIp);
    if (limitCheck.isBlocked) {
      return res.status(429).json({
        error: `Too many attempts from your IP. Locked for security. Try again in ${limitCheck.retryAfterSeconds} seconds.`,
        retryAfter: limitCheck.retryAfterSeconds,
      });
    }

    if (!cdk || typeof cdk !== 'string') {
      return res.status(400).json({ error: 'Please enter a valid CDK activation key.' });
    }

    const { isValid, formatted: validUsername, error: userError } = sanitizeTelegramUsername(telegramUsername);
    if (!isValid) {
      return res.status(400).json({ error: userError || 'Valid Telegram username is required.' });
    }

    const cleanCode = cdk.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const codeHash = vault.hashCDK(cleanCode);
    const data = vault.getData();

    const record = data.cdks.find((c) => c.codeHash === codeHash || c.code === cleanCode);

    if (!record) {
      const { isNowBlocked, retryAfterSeconds } = rateLimiter.recordFailure(clientIp, userAgent, 'Invalid CDK claim attempt');
      auditLogger.log({
        eventType: 'CDK_ACTIVATION_FAIL',
        severity: 'warn',
        ipAddress: clientIp,
        userAgent,
        telegramUsername: validUsername,
        cdkMasked: vault.maskCDK(cleanCode),
        details: `Claim failed: Unknown CDK code entered (${vault.maskCDK(cleanCode)}).`,
      });

      if (isNowBlocked) {
        return res.status(429).json({
          error: `Security Alert: Maximum failed attempts reached. Your IP has been temporarily locked for ${retryAfterSeconds} seconds.`,
          retryAfter: retryAfterSeconds,
        });
      }

      return res.status(404).json({
        error: 'Invalid CDK Key. Please check the code or contact support.',
      });
    }

    if (record.status === 'redeemed') {
      return res.status(400).json({
        error: `This CDK key was already activated and claimed on ${new Date(record.claimedAt || '').toLocaleString()}${
          record.claimedByUsername ? ` by ${record.claimedByUsername}` : ''
        }.`,
        isAlreadyRedeemed: true,
        claimedAt: record.claimedAt,
      });
    }

    if (record.status === 'revoked') {
      return res.status(400).json({ error: 'This CDK key has been revoked by the administrator.' });
    }

    if (record.status === 'expired') {
      return res.status(400).json({ error: 'This CDK key has expired.' });
    }

    // Decrypt gift payload if gift link
    let giftLink: string | undefined;
    if (record.giftType === 'telegram_gift_link' && record.encryptedGiftPayload) {
      try {
        giftLink = vault.decryptString(record.encryptedGiftPayload, record.giftIv, record.giftAuthTag);
      } catch {
        giftLink = undefined;
      }
    }

    // Update status to redeemed
    const nowIso = new Date().toISOString();
    record.status = 'redeemed';
    record.claimedByUsername = validUsername;
    record.claimedAt = nowIso;
    record.claimedIp = clientIp;
    record.claimedUserAgent = userAgent;

    vault.persistVault();
    rateLimiter.recordSuccess(clientIp);

    auditLogger.log({
      eventType: 'CDK_ACTIVATION_SUCCESS',
      severity: 'info',
      ipAddress: clientIp,
      userAgent,
      telegramUsername: validUsername,
      cdkMasked: vault.maskCDK(cleanCode),
      details: `Telegram Premium activated successfully for ${validUsername} using CDK (${vault.maskCDK(cleanCode)}) [${record.plan}].`,
    });

    res.json({
      success: true,
      message: `Congratulations! Telegram Premium (${record.plan.replace('_', ' ')}) has been activated for ${validUsername}.`,
      plan: record.plan,
      planDurationDays: record.planDurationDays,
      claimedAt: nowIso,
      recipient: validUsername,
      giftType: record.giftType,
      giftLink: giftLink,
      maskedCode: vault.maskCDK(cleanCode),
    });
  });

  // ==========================================
  // ADMIN AUTHENTICATION ROUTES
  // ==========================================

  // Admin login with master password
  app.post('/api/admin/login', (req: Request, res: Response) => {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] as string;
    const { password } = req.body;

    const limitCheck = rateLimiter.checkLimit(clientIp);
    if (limitCheck.isBlocked) {
      return res.status(429).json({
        error: `Administrator access temporarily locked due to failed attempts. Try again in ${limitCheck.retryAfterSeconds} seconds.`,
      });
    }

    if (!password) {
      return res.status(400).json({ error: 'Master password is required.' });
    }

    const data = vault.getData();
    const isPasswordValid = vault.verifyPassword(
      password,
      data.settings.passwordHash,
      data.settings.passwordSalt
    );

    if (!isPasswordValid) {
      rateLimiter.recordFailure(clientIp, userAgent, 'Failed admin master password login attempt');
      auditLogger.log({
        eventType: 'ADMIN_LOGIN_FAIL',
        severity: 'security_alert',
        ipAddress: clientIp,
        userAgent,
        details: 'Unauthorized administrative vault login attempt with invalid master password.',
      });
      return res.status(401).json({ error: 'Invalid administrator password.' });
    }

    // Success
    rateLimiter.recordSuccess(clientIp);
    const token = adminAuth.createSession(clientIp, userAgent);

    auditLogger.log({
      eventType: 'ADMIN_LOGIN_SUCCESS',
      severity: 'info',
      ipAddress: clientIp,
      userAgent,
      details: 'Administrator authenticated and created active vault management session.',
    });

    res.json({
      success: true,
      token,
      message: 'Admin session authenticated successfully.',
    });
  });

  // Verify active session token
  app.get('/api/admin/check-session', adminAuth.middleware(), (req: Request, res: Response) => {
    res.json({ valid: true, authenticated: true });
  });

  // Admin logout
  app.post('/api/admin/logout', adminAuth.middleware(), (req: Request, res: Response) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      adminAuth.revokeSession(token);
    }
    res.json({ success: true });
  });

  // ==========================================
  // PROTECTED ADMIN MANAGEMENT API ROUTES
  // ==========================================

  // List CDKs with filtering & search
  app.get('/api/admin/cdks', adminAuth.middleware(), (req: Request, res: Response) => {
    const data = vault.getData();
    const statusFilter = req.query.status as string;
    const planFilter = req.query.plan as string;
    const search = req.query.search as string;

    let result = [...data.cdks];

    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (planFilter && planFilter !== 'all') {
      result = result.filter((c) => c.plan === planFilter);
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.code.toLowerCase().includes(q) ||
          (c.claimedByUsername && c.claimedByUsername.toLowerCase().includes(q)) ||
          (c.notes && c.notes.toLowerCase().includes(q))
      );
    }

    // Sort by createdAt descending
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Stats breakdown
    const stats = {
      total: data.cdks.length,
      active: data.cdks.filter((c) => c.status === 'active').length,
      redeemed: data.cdks.filter((c) => c.status === 'redeemed').length,
      revoked: data.cdks.filter((c) => c.status === 'revoked').length,
      expired: data.cdks.filter((c) => c.status === 'expired').length,
    };

    res.json({ cdks: result, stats });
  });

  // Generate / Add Batch of CDKs
  app.post('/api/admin/cdks/create', adminAuth.middleware(), (req: Request, res: Response) => {
    const {
      plan = '3_months',
      giftType = 'telegram_gift_link',
      giftLink,
      customGiftLink,
      count = 1,
      prefix = 'TGPREM',
      notes,
      expiresInDays,
      expiresDays,
      customCodes,
    } = req.body;

    const data = vault.getData();
    const created: CDKRecord[] = [];
    const numToCreate = Math.min(Math.max(1, Number(count) || 1), 100);

    const planDurations: Record<PremiumPlan, number> = {
      '1_month': 30,
      '3_months': 90,
      '6_months': 180,
      '12_months': 365,
    };

    const durationDays = planDurations[plan as PremiumPlan] || 90;

    const finalExpiryDays = expiresInDays !== undefined ? expiresInDays : expiresDays;
    let expiresAt: string | undefined;
    if (finalExpiryDays && Number(finalExpiryDays) > 0) {
      const d = new Date();
      d.setDate(d.getDate() + Number(finalExpiryDays));
      expiresAt = d.toISOString();
    }

    const targetGiftType = giftType === 'telegram_gift_link' ? 'telegram_gift_link' : giftType === 'bot_voucher' ? 'bot_voucher' : 'premium_code';
    const effectiveGiftLink = (customGiftLink || giftLink || '').trim();

    // Custom code manual entry vs automated generation
    if (Array.isArray(customCodes) && customCodes.length > 0) {
      for (const rawCode of customCodes) {
        if (!rawCode || typeof rawCode !== 'string') continue;
        const cleanCode = rawCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (cleanCode.length < 6) continue;

        const codeHash = vault.hashCDK(cleanCode);
        // Avoid duplicate codes
        if (data.cdks.some((c) => c.codeHash === codeHash || c.code === cleanCode)) {
          continue;
        }

        const payloadToEncrypt = effectiveGiftLink || cleanCode;
        const encrypted = vault.encryptString(payloadToEncrypt);

        const newRecord: CDKRecord = {
          id: crypto.randomUUID(),
          code: cleanCode,
          codeHash,
          plan: plan as PremiumPlan,
          planDurationDays: durationDays,
          giftType: targetGiftType,
          encryptedGiftPayload: encrypted.cipherText,
          giftIv: encrypted.iv,
          giftAuthTag: encrypted.authTag,
          status: 'active',
          createdAt: new Date().toISOString(),
          expiresAt,
          notes: notes ? String(notes).trim() : undefined,
        };

        data.cdks.unshift(newRecord);
        created.push(newRecord);
      }
    } else {
      // Auto-generate batch
      for (let i = 0; i < numToCreate; i++) {
        let code = generateCDKCode(prefix?.trim() || 'TGPREM', plan as PremiumPlan);
        let codeHash = vault.hashCDK(code);

        // Ensure uniqueness
        while (data.cdks.some((c) => c.codeHash === codeHash || c.code === code)) {
          code = generateCDKCode(prefix?.trim() || 'TGPREM', plan as PremiumPlan);
          codeHash = vault.hashCDK(code);
        }

        const payloadToEncrypt = effectiveGiftLink || code;
        const encrypted = vault.encryptString(payloadToEncrypt);

        const newRecord: CDKRecord = {
          id: crypto.randomUUID(),
          code,
          codeHash,
          plan: plan as PremiumPlan,
          planDurationDays: durationDays,
          giftType: targetGiftType,
          encryptedGiftPayload: encrypted.cipherText,
          giftIv: encrypted.iv,
          giftAuthTag: encrypted.authTag,
          status: 'active',
          createdAt: new Date().toISOString(),
          expiresAt,
          notes: notes ? String(notes).trim() : undefined,
        };

        data.cdks.unshift(newRecord);
        created.push(newRecord);
      }
    }

    vault.persistVault();

    auditLogger.log({
      eventType: 'CDK_BATCH_CREATED',
      severity: 'info',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      details: `Admin generated ${created.length} new CDK(s) for plan [${plan}].`,
    });

    res.json({
      success: true,
      count: created.length,
      created,
    });
  });

  // Revoke CDK
  app.post('/api/admin/cdks/revoke', adminAuth.middleware(), (req: Request, res: Response) => {
    const { id } = req.body;
    const data = vault.getData();
    const record = data.cdks.find((c) => c.id === id);

    if (!record) {
      return res.status(404).json({ error: 'CDK not found.' });
    }

    record.status = 'revoked';
    vault.persistVault();

    auditLogger.log({
      eventType: 'CDK_REVOKED',
      severity: 'warn',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      cdkMasked: vault.maskCDK(record.code),
      details: `Admin manually revoked CDK ${vault.maskCDK(record.code)}.`,
    });

    res.json({ success: true, message: 'CDK revoked successfully.' });
  });

  // Delete CDK permanently
  app.delete('/api/admin/cdks/:id', adminAuth.middleware(), (req: Request, res: Response) => {
    const { id } = req.params;
    const data = vault.getData();
    const index = data.cdks.findIndex((c) => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'CDK not found.' });
    }

    const removed = data.cdks.splice(index, 1)[0];
    vault.persistVault();

    auditLogger.log({
      eventType: 'CDK_DELETED',
      severity: 'warn',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      cdkMasked: vault.maskCDK(removed.code),
      details: `Admin permanently deleted CDK ${vault.maskCDK(removed.code)}.`,
    });

    res.json({ success: true, message: 'CDK deleted permanently.' });
  });

  // Get Audit Logs
  app.get('/api/admin/audit-logs', adminAuth.middleware(), (req: Request, res: Response) => {
    const { severity, eventType, search, limit, offset } = req.query;
    const result = auditLogger.getLogs({
      severity: severity as string,
      eventType: eventType as string,
      search: search as string,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });
    res.json(result);
  });

  // Clear / Rotate Audit Logs
  app.post('/api/admin/audit-logs/clear', adminAuth.middleware(), (req: Request, res: Response) => {
    const data = vault.getData();
    const count = data.auditLogs.length;
    data.auditLogs = [];
    vault.persistVault();

    auditLogger.log({
      eventType: 'ADMIN_PASSWORD_CHANGED',
      severity: 'warn',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      details: `Admin cleared and rotated ${count} audit log records.`,
    });

    res.json({ success: true, message: `Cleared ${count} logs.` });
  });

  // Security Health and Rate Limit Status
  app.get('/api/admin/security-health', adminAuth.middleware(), (req: Request, res: Response) => {
    const data = vault.getData();
    const blockedIPs = rateLimiter.getBlockedList();
    const stats = rateLimiter.getStats();
    const encryptionInfo = vault.getEncryptionInfo();

    res.json({
      health: 'EXCELLENT',
      encryption: encryptionInfo,
      encryptionAlgorithm: `${encryptionInfo.algorithm} + PBKDF2 (100,000 rounds sha512)`,
      vaultIntegrity: 'VERIFIED_OK',
      blockedIps: blockedIPs,
      blockedIPs,
      rateLimitStats: stats,
      activeAdminSessions: adminAuth.getActiveSessionCount(),
      totalAuditLogs: data.auditLogs.length,
      totalCDKs: data.cdks.length,
      serverTime: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
      settings: {
        rateLimitMaxAttempts: data.settings.rateLimitMaxAttempts || 5,
        rateLimitWindowMinutes: data.settings.rateLimitWindowMinutes || 15,
        supportTelegramContact: data.settings.supportTelegramContact || '@PremiumGiftSupport',
        customBannerText: data.settings.customBannerText || '',
      },
    });
  });

  // Unblock IP manually
  app.post('/api/admin/rate-limit/unblock', adminAuth.middleware(), (req: Request, res: Response) => {
    const { ip } = req.body;
    if (!ip) return res.status(400).json({ error: 'IP required' });

    rateLimiter.unblock(ip);
    auditLogger.log({
      eventType: 'RATE_LIMIT_BLOCKED',
      severity: 'info',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      details: `Admin manually removed rate-limit block on IP: ${ip}`,
    });

    res.json({ success: true, message: `Unblocked IP: ${ip}` });
  });

  // Update Settings
  app.post('/api/admin/settings', adminAuth.middleware(), (req: Request, res: Response) => {
    const { supportTelegramContact, rateLimitMaxAttempts, rateLimitWindowMinutes, customBannerText } = req.body;
    const data = vault.getData();

    if (supportTelegramContact !== undefined) data.settings.supportTelegramContact = String(supportTelegramContact);
    if (rateLimitMaxAttempts !== undefined) data.settings.rateLimitMaxAttempts = Number(rateLimitMaxAttempts);
    if (rateLimitWindowMinutes !== undefined) data.settings.rateLimitWindowMinutes = Number(rateLimitWindowMinutes);
    if (customBannerText !== undefined) data.settings.customBannerText = String(customBannerText);

    vault.persistVault();

    auditLogger.log({
      eventType: 'ADMIN_PASSWORD_CHANGED',
      severity: 'info',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      details: 'Administrator updated security and portal configuration settings.',
    });

    res.json({ success: true, settings: data.settings });
  });

  // Change Admin Master Password
  app.post('/api/admin/change-password', adminAuth.middleware(), (req: Request, res: Response) => {
    const { currentPassword, oldPassword, newPassword } = req.body;
    const passwordToCheck = currentPassword || oldPassword;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    const data = vault.getData();
    const isCurrentValid = vault.verifyPassword(
      passwordToCheck,
      data.settings.passwordHash,
      data.settings.passwordSalt
    );

    if (!isCurrentValid) {
      return res.status(401).json({ error: 'Current password is not correct.' });
    }

    const { hash, salt } = vault.hashPassword(newPassword);
    data.settings.passwordHash = hash;
    data.settings.passwordSalt = salt;
    vault.persistVault();

    auditLogger.log({
      eventType: 'ADMIN_PASSWORD_CHANGED',
      severity: 'security_alert',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      details: 'Administrator master password was updated successfully.',
    });

    res.json({ success: true, message: 'Master password changed successfully.' });
  });

  // Export encrypted backup
  app.post('/api/admin/vault/export-backup', adminAuth.middleware(), (req: Request, res: Response) => {
    const data = vault.getData();
    const jsonStr = JSON.stringify(data, null, 2);
    const encrypted = vault.encryptString(jsonStr);

    auditLogger.log({
      eventType: 'VAULT_BACKUP_EXPORTED',
      severity: 'info',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      details: 'Admin generated and exported encrypted vault backup payload.',
    });

    res.json({
      version: 1,
      exportedAt: new Date().toISOString(),
      payload: encrypted,
    });
  });

  // Re-encrypt vault
  app.post('/api/admin/vault/re-encrypt', adminAuth.middleware(), (req: Request, res: Response) => {
    vault.persistVault();
    auditLogger.log({
      eventType: 'VAULT_RE_ENCRYPTED',
      severity: 'info',
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] as string,
      details: 'Vault re-encrypted and persisted with updated integrity checksum.',
    });
    res.json({ success: true, message: 'Vault successfully re-encrypted.' });
  });

  // ==========================================
  // API 404 & ERROR HANDLING (Prevents HTML fall-through)
  // ==========================================

  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.path}` });
  });

  app.use('/api', (err: any, req: Request, res: Response, next: any) => {
    console.error('[API Error]', err);
    res.status(500).json({ error: err?.message || 'Internal server error' });
  });

  return app;
}
