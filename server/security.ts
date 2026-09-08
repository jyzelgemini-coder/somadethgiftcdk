import { Request, Response, NextFunction } from 'express';

// In-memory rate limiting map: ip -> { count, resetTime }
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodically clean expired records every 60s to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000);

/**
 * Creates an in-memory sliding window rate limiter middleware
 * Protects against DDoS, brute-force scraping, and request flood attacks
 */
export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  name?: string;
  errorMessage?: string;
}) {
  const { windowMs, maxRequests, name = 'global', errorMessage } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Get client IP safely
    const forwarded = req.headers['x-forwarded-for'];
    const rawIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.socket.remoteAddress || 'unknown';
    const key = `${name}:${rawIp}`;

    const now = Date.now();
    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSec = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        success: false,
        error: errorMessage || `Too many requests. DDoS protection triggered. Please wait ${retryAfterSec}s and try again.`,
        retryAfter: retryAfterSec,
      });
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    next();
  };
}

/**
 * Helmet-style HTTP security headers middleware
 * Blocks clickjacking, MIME-sniffing, XSS vectors, and referrer leaks
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking via iframes from other domains
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Cross-Site Scripting protection filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer control: do not leak tokens in referrers
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Prevent DNS prefetching leaks
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  // Remove X-Powered-By to hide server stack info from port scans
  res.removeHeader('X-Powered-By');
  next();
}

/**
 * Admin authentication middleware
 * Validates the ADMIN_SECRET_KEY to prevent unauthorized access to CDK lists, database creation, or deletion
 */
export const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'somadeth2026';

export function requireAdminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['x-admin-key'] || req.headers['authorization'];
  const queryKey = req.query.adminKey;

  let providedKey = '';
  if (typeof authHeader === 'string') {
    providedKey = authHeader.replace(/^Bearer\s+/i, '').trim();
  } else if (typeof queryKey === 'string') {
    providedKey = queryKey.trim();
  }

  if (!providedKey || providedKey !== ADMIN_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized admin access. Valid Admin Secret Key is required.',
      requiresAuth: true,
    });
  }

  next();
}

/**
 * Input sanitization helpers to prevent injection or malicious inputs
 */
export function sanitizeUsername(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().replace(/[^a-zA-Z0-9_@]/g, '').slice(0, 33);
}

export function sanitizeCdkCode(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 36);
}

export function sanitizeText(input: unknown, maxLen = 200): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // remove HTML tags
    .trim()
    .slice(0, maxLen);
}
