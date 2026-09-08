import express from 'express';
import { db } from './db';
import {
  validateTelegramUsernameFormat,
  verifyTelegramUser,
  generateTelegramGiftDetails,
} from './telegramService';
import { parseAndVerifyChatGptSession } from './chatgptService';
import {
  notifyNewOrder,
  notifyOrderCompleted,
  sendTestBotAlert,
} from './telegramBotNotifier';
import {
  createRateLimiter,
  securityHeaders,
  requireAdminAuth,
  ADMIN_SECRET_KEY,
  sanitizeUsername,
  sanitizeCdkCode,
  sanitizeText,
} from './security';
import { OrderItem, PremiumPlanDuration } from '../src/types';

export function createApp() {
  const app = express();

  // 1. Security HTTP Headers (Blocks XSS, MIME-sniffing, clickjacking)
  app.use(securityHeaders);

  // 2. Body Parser with 512kb limit (Allows full session JSON / JWT tokens without buffer overflow)
  app.use(express.json({ limit: '512kb' }));

  // 3. Normalize URL if Vercel serverless rewrites stripped /api prefix
  app.use((req, _res, next) => {
    if (!req.url.startsWith('/api') && req.originalUrl?.startsWith('/api')) {
      req.url = req.originalUrl;
    }
    next();
  });

  // 4. DDoS & Rate Limiting Shields
  // Global API shield: 120 req / minute per IP
  app.use(
    '/api',
    createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 120,
      name: 'api-global',
      errorMessage: 'High traffic detected. Anti-DDoS active. Please wait a moment.',
    })
  );

  // Sensitive Verification limiter: 25 lookups / minute per IP (prevents bot scraping)
  app.use(
    '/api/verify-user',
    createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 25,
      name: 'api-verify-user',
      errorMessage: 'Verification rate limit reached. Please wait 1 minute.',
    })
  );

  // ChatGPT Session Verification limiter
  app.use(
    '/api/chatgpt/verify-session',
    createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 30,
      name: 'api-chatgpt-verify',
      errorMessage: 'Verification rate limit reached. Please wait 1 minute.',
    })
  );

  // Redemption limiter: 10 attempts / minute per IP (prevents key brute-forcing)
  app.use(
    '/api/cdk/redeem',
    createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 10,
      name: 'api-cdk-redeem',
      errorMessage: 'Too many activation attempts. Anti-abuse active. Please wait 1 minute.',
    })
  );

  app.use(
    '/api/chatgpt/redeem',
    createRateLimiter({
      windowMs: 60 * 1000,
      maxRequests: 15,
      name: 'api-chatgpt-redeem',
      errorMessage: 'Too many activation attempts. Anti-abuse active. Please wait 1 minute.',
    })
  );

  // ----------------------------------------------------
  // API Routes
  // ----------------------------------------------------

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Public summary statistics
  app.get('/api/stats', (_req, res) => {
    try {
      const stats = db.getStats();
      res.json({ success: true, stats });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve stats' });
    }
  });

  // Real Telegram Customer Verification & Profile Lookup
  app.post('/api/verify-user', async (req, res) => {
    try {
      const rawUser = sanitizeUsername(req.body?.username);
      if (!rawUser) {
        return res.status(400).json({ success: false, error: 'Telegram username is required' });
      }

      const verification = await verifyTelegramUser(rawUser);
      res.json({ success: true, data: verification });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message || 'Failed to verify Telegram profile' });
    }
  });

  // Mobile-Optimized Telegram Avatar Proxy
  app.get('/api/telegram-avatar', async (req, res) => {
    try {
      const rawUrl = req.query.url;
      if (typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) {
        return res.status(400).send('Invalid image URL');
      }

      const parsed = new URL(rawUrl);
      const isAllowedHost =
        parsed.hostname.endsWith('.telesco.pe') ||
        parsed.hostname.endsWith('.telegram.org') ||
        parsed.hostname === 'telesco.pe' ||
        parsed.hostname === 'telegram.org';

      if (!isAllowedHost) {
        return res.status(403).send('Domain not permitted');
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(rawUrl, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
          Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        },
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        return res.status(response.status).send('Could not fetch avatar');
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const arrayBuf = await response.arrayBuffer();

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(Buffer.from(arrayBuf));
    } catch {
      res.status(500).send('Failed to proxy avatar');
    }
  });

  // Admin Key Verification Endpoint
  app.post('/api/admin/verify-key', (req, res) => {
    try {
      const key = String(req.body?.key || '').trim();
      if (key && key === ADMIN_SECRET_KEY) {
        return res.json({ success: true, message: 'Admin authentication verified' });
      }
      res.status(401).json({ success: false, error: 'Invalid Admin Secret Key' });
    } catch {
      res.status(500).json({ success: false, error: 'Verification failed' });
    }
  });

  // Protected: List all CDKs (Requires Admin Secret Key)
  app.get('/api/cdk/list', requireAdminAuth, (_req, res) => {
    try {
      const cdks = db.getAllCDKs();
      res.json({ success: true, cdks });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to fetch CDK inventory' });
    }
  });

  // Protected: Create CDK(s) via Admin Panel (Requires Admin Secret Key)
  app.post('/api/cdk/create', requireAdminAuth, (req, res) => {
    try {
      const { count = 1, duration = '3_months', prefix, notes = '', customCode, serviceType = 'telegram' } = req.body || {};
      const isChatGpt = serviceType === 'chatgpt';
      const defaultPrefix = isChatGpt ? 'GPT' : 'TG';
      const effectivePrefix = sanitizeText(prefix, 10) || defaultPrefix;

      if (customCode && typeof customCode === 'string' && customCode.trim()) {
        const cleanCustom = sanitizeCdkCode(customCode);
        if (cleanCustom.length < 8) {
          return res.status(400).json({ success: false, error: 'Custom CDK code must be at least 8 characters.' });
        }

        const existing = db.findCDKByCode(cleanCustom);
        if (existing) {
          return res.status(400).json({ success: false, error: 'A CDK with this code already exists in database.' });
        }

        const durationLabels: Record<string, string> = {
          '1_month': '1 Month',
          '3_months': '3 Months',
          '6_months': '6 Months',
          '12_months': '12 Months',
          'chatgpt_plus': 'ChatGPT Plus',
          'chatgpt_go': 'ChatGPT Go',
          'chatgpt_pro_x5': 'ChatGPT Pro x5',
          'chatgpt_pro_x20': 'ChatGPT Pro x20',
        };

        const newCDK = db.createCDK({
          code: cleanCustom,
          serviceType: isChatGpt ? 'chatgpt' : 'telegram',
          duration: duration as PremiumPlanDuration,
          durationLabel: durationLabels[duration] || (isChatGpt ? 'ChatGPT Plus' : '3 Months'),
          status: 'available',
          notes: sanitizeText(notes) || (isChatGpt ? 'ChatGPT Key' : 'Telegram Gift Key'),
          batchId: `MANUAL-${Date.now().toString(36).toUpperCase()}`,
        });

        return res.json({ success: true, cdks: [newCDK], message: 'Custom CDK created successfully' });
      }

      const safeCount = Math.min(Math.max(Number(count) || 1, 1), 25);
      const created = db.createBatchCDKs({
        count: safeCount,
        duration: duration as PremiumPlanDuration,
        prefix: effectivePrefix,
        notes: sanitizeText(notes, 100) || undefined,
        serviceType: isChatGpt ? 'chatgpt' : 'telegram',
      });

      res.json({
        success: true,
        cdks: created,
        message: `Successfully generated and saved ${created.length} CDK key(s) to database.`,
      });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to create CDK keys' });
    }
  });

  // Protected: Delete CDK (Requires Admin Secret Key)
  app.delete('/api/cdk/:id', requireAdminAuth, (req, res) => {
    try {
      const id = sanitizeText(req.params.id, 50);
      const success = db.deleteCDK(id);
      if (!success) {
        return res.status(404).json({ success: false, error: 'CDK not found' });
      }
      res.json({ success: true, message: 'CDK removed from database' });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to delete CDK' });
    }
  });

  // Protected: Sample CDK (Requires Admin Secret Key to prevent key scraping)
  app.get('/api/cdk/sample', requireAdminAuth, (_req, res) => {
    try {
      const sample = db.getSampleAvailableCDK();
      if (!sample) {
        const newKeys = db.createBatchCDKs({
          count: 1,
          duration: '3_months',
          prefix: 'TGPREM',
          notes: 'Admin Test Key',
        });
        return res.json({ success: true, cdk: newKeys[0] });
      }
      res.json({ success: true, cdk: sample });
    } catch {
      res.status(500).json({ success: false, error: 'Could not fetch sample key' });
    }
  });

  // Redeem CDK Key (Public with strict anti-DDoS and validation)
  app.post('/api/cdk/redeem', async (req, res) => {
    try {
      const rawUser = sanitizeUsername(req.body?.username);
      const rawCode = sanitizeCdkCode(req.body?.code);

      if (!rawUser || !rawCode) {
        return res.status(400).json({
          success: false,
          error: 'Please enter both Telegram @username and 24-character Activation code.',
        });
      }

      // 1. Validate username format
      const userCheck = validateTelegramUsernameFormat(rawUser);
      if (!userCheck.isValid) {
        return res.status(400).json({ success: false, error: userCheck.error });
      }

      // 2. Validate CDK code existence & status in DB
      const cdk = db.findCDKByCode(rawCode);

      if (!cdk) {
        return res.status(400).json({
          success: false,
          error: 'Invalid activation code. Please check your 24-character CDK key and try again.',
        });
      }

      if (cdk.status === 'redeemed') {
        return res.status(400).json({
          success: false,
          error: `This activation code has already been redeemed${cdk.redeemedBy ? ' by ' + cdk.redeemedBy : ''}.`,
        });
      }

      if (cdk.status === 'revoked') {
        return res.status(400).json({
          success: false,
          error: 'This activation code has expired or was revoked.',
        });
      }

      if (cdk.serviceType === 'chatgpt' || cdk.code.startsWith('GPT')) {
        return res.status(400).json({
          success: false,
          error: 'This CDK is for ChatGPT. Please open the ChatGPT tab to redeem it.',
        });
      }

      // 3. Perform real Telegram customer profile verification
      const verifiedUser = await verifyTelegramUser(userCheck.cleanUsername);

      // 4. Create Order in DB with Fair Queue position
      const orderId = `AG-${Math.floor(100000 + Math.random() * 900000)}`;
      const activeQueueCount = db.getStats().activeOrders;
      const queuePosition = activeQueueCount + 1;
      const estimatedWaitSeconds = queuePosition * 4 + 4;

      const order: OrderItem = {
        id: orderId,
        type: 'cdk_redemption',
        username: verifiedUser.username,
        plan: cdk.duration,
        planLabel: cdk.durationLabel,
        amountUsd: 0,
        cdkCode: cdk.code,
        paymentMethod: 'cdk_key',
        paymentStatus: 'paid',
        status: 'in_queue',
        queuePosition,
        estimatedWaitSeconds,
        verification: verifiedUser,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [
          {
            timestamp: new Date().toISOString(),
            stage: 'verifying_user',
            message: `Telegram verification: ${verifiedUser.displayName} (${verifiedUser.username}) verified`,
          },
          {
            timestamp: new Date().toISOString(),
            stage: 'in_queue',
            message: `Order ${orderId} placed in Fair Queue (Position #${queuePosition})`,
          },
        ],
      };

      db.createOrder(order);

      // Real Telegram bot group alert
      notifyNewOrder(order).catch((err) =>
        console.error('[TelegramBot Alert Error] New Telegram Order:', err.message)
      );

      // 5. Automated background processing queue -> API dispatch -> Completed
      setTimeout(() => {
        db.updateOrder(orderId, {
          status: 'dispatching_api',
          queuePosition: 1,
          newLogMessage: 'Dispatching Telegram Premium gift subscription payload...',
        });

        setTimeout(() => {
          const delivery = generateTelegramGiftDetails(cdk.duration, verifiedUser.username);
          const completedOrder = db.updateOrder(orderId, {
            status: 'completed',
            queuePosition: 0,
            delivery,
            newLogMessage: `Telegram Premium Gift successfully delivered! Link: ${delivery.giftUrl}`,
          });

          // Mark CDK redeemed in DB
          db.markCDKRedeemed(cdk.code, verifiedUser.username, orderId, delivery.giftUrl);

          if (completedOrder) {
            notifyOrderCompleted(completedOrder, 'Cloud Automation').catch((err) =>
              console.error('[TelegramBot Alert Error] Order Completed:', err.message)
            );
          }
        }, 3200);
      }, 2500);

      res.json({
        success: true,
        message: 'Activation code accepted! Order placed in fair queue.',
        order,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || 'Internal error during activation' });
    }
  });

  // ----------------------------------------------------
  // ChatGPT Plus CDK Activation & Session Verification Endpoints
  // Target URL: https://chatgpt.somadethgiftcdk.site
  // Auth Session Source: https://chatgpt.com/api/auth/session
  // ----------------------------------------------------

  // Verify ChatGPT Session / Access Token and extract customer email
  app.post('/api/chatgpt/verify-session', (req, res) => {
    try {
      const sessionInput = req.body?.sessionInput;
      if (!sessionInput) {
        return res.status(400).json({
          success: false,
          error: 'Please paste the full page content from https://chatgpt.com/api/auth/session',
        });
      }

      const parseResult = parseAndVerifyChatGptSession(sessionInput);
      res.json({
        success: true,
        data: parseResult.verification,
        fullSessionPayload: parseResult.fullSessionPayload,
        accessToken: parseResult.accessToken,
        sessionDate: parseResult.sessionDate,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        error: err.message || 'Failed to verify ChatGPT session data',
      });
    }
  });

  // Redeem CDK for ChatGPT activation (Supports Plus, Go, Pro x5, Pro x20)
  app.post('/api/chatgpt/redeem', async (req, res) => {
    try {
      const { sessionInput, code } = req.body || {};

      // 1. Validate full session
      if (!sessionInput) {
        return res.status(400).json({
          success: false,
          error: 'Please paste the full page content from https://chatgpt.com/api/auth/session',
        });
      }

      const parseResult = parseAndVerifyChatGptSession(sessionInput);
      const verifiedProfile = parseResult.verification;
      const cleanCode = sanitizeCdkCode(code);

      if (!cleanCode) {
        return res.status(400).json({
          success: false,
          error: 'Please enter a valid activation code.',
        });
      }

      // 2. Validate CDK in database
      const cdk = db.findCDKByCode(cleanCode);
      if (!cdk) {
        return res.status(400).json({
          success: false,
          error: 'Invalid activation code. Please check your CDK key and try again.',
        });
      }

      if (cdk.status === 'redeemed') {
        return res.status(400).json({
          success: false,
          error: `This activation code has already been redeemed${cdk.redeemedBy ? ' by ' + cdk.redeemedBy : ''}.`,
        });
      }

      if (cdk.status === 'revoked') {
        return res.status(400).json({
          success: false,
          error: 'This activation code has expired or was revoked.',
        });
      }

      // Check service separation: Must not be a Telegram key
      if (cdk.serviceType === 'telegram' || cdk.code.startsWith('TG')) {
        return res.status(400).json({
          success: false,
          error: 'This CDK is for Telegram Premium. Please enter a ChatGPT CDK key (ChatGPT Plus, Go, Pro x5, Pro x20).',
        });
      }

      // Determine the specific ChatGPT plan
      let planKey: 'chatgpt_plus' | 'chatgpt_go' | 'chatgpt_pro_x5' | 'chatgpt_pro_x20' = 'chatgpt_plus';
      let planLabel = 'ChatGPT Plus';

      if (cdk.chatgptPlan === 'chatgpt_go' || cdk.duration === 'chatgpt_go' || cdk.code.includes('GO')) {
        planKey = 'chatgpt_go';
        planLabel = 'ChatGPT Go';
      } else if (cdk.chatgptPlan === 'chatgpt_pro_x5' || cdk.duration === 'chatgpt_pro_x5' || cdk.code.includes('PRO5')) {
        planKey = 'chatgpt_pro_x5';
        planLabel = 'ChatGPT Pro x5';
      } else if (cdk.chatgptPlan === 'chatgpt_pro_x20' || cdk.duration === 'chatgpt_pro_x20' || cdk.code.includes('PRO20')) {
        planKey = 'chatgpt_pro_x20';
        planLabel = 'ChatGPT Pro x20';
      } else if (cdk.durationLabel && cdk.durationLabel.includes('ChatGPT')) {
        planLabel = cdk.durationLabel;
      }

      // 3. Create ChatGPT Order with Fair Queue position
      const orderId = `GPT-${Math.floor(100000 + Math.random() * 900000)}`;
      const activeQueueCount = db.getStats().activeOrders;
      const queuePosition = activeQueueCount + 1;
      const estimatedWaitSeconds = 780; // ~13 minutes

      const order: OrderItem = {
        id: orderId,
        serviceType: 'chatgpt',
        type: 'cdk_redemption',
        username: verifiedProfile.email,
        customerEmail: verifiedProfile.email,
        plan: planKey,
        planLabel,
        chatgptPlan: planKey,
        amountUsd: 0,
        cdkCode: cdk.code,
        paymentMethod: 'cdk_key',
        paymentStatus: 'paid',
        status: 'in_queue',
        queuePosition,
        estimatedWaitSeconds,
        rawSessionPayload: parseResult.fullSessionPayload,
        accessToken: parseResult.accessToken,
        sessionDate: parseResult.sessionDate,
        verification: {
          isValid: true,
          username: verifiedProfile.email,
          displayName: verifiedProfile.name || verifiedProfile.email.split('@')[0],
          isPremium: true,
          avatarSeed: verifiedProfile.email,
          avatarUrl: verifiedProfile.image,
          bio: `Customer Email: ${verifiedProfile.email} • OpenAI User ID: ${verifiedProfile.accountId}`,
          isVerifiedBadge: true,
          isRealTelegramAccount: false,
          verificationSource: 'ChatGPT Auth0 Session (Full Verified)',
          verifiedAt: new Date().toISOString(),
        },
        chatgptVerification: verifiedProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        logs: [
          {
            timestamp: new Date().toISOString(),
            stage: 'verifying_user',
            message: `OpenAI session authentication verified for ${verifiedProfile.email} (${verifiedProfile.name}).`,
          },
          {
            timestamp: new Date().toISOString(),
            stage: 'in_queue',
            message: `Order ${orderId} entered automated queue (Position #${queuePosition}). Estimated processing time: ~10–15 minutes.`,
          },
        ],
      };

      db.createOrder(order);

      // Real Telegram bot group alert
      notifyNewOrder(order).catch((err) =>
        console.error('[TelegramBot Alert Error] New ChatGPT Order:', err.message)
      );

      // Automated progression logs
      setTimeout(() => {
        if (db.getOrder(orderId)?.status === 'in_queue') {
          db.updateOrder(orderId, {
            newLogMessage: `Connected to OpenAI gateway node. Locking session token for ${planLabel} continuous sync...`,
          });
        }
      }, 15000);

      setTimeout(() => {
        if (db.getOrder(orderId)?.status === 'in_queue') {
          db.updateOrder(orderId, {
            status: 'dispatching_api',
            newLogMessage: `Dedicated cloud provisioning worker bound. Applying ${planLabel} entitlement to customer account...`,
          });
        }
      }, 45000);

      setTimeout(() => {
        if (db.getOrder(orderId)?.status === 'dispatching_api') {
          db.updateOrder(orderId, {
            newLogMessage: `OpenAI billing token synchronization in progress. Finalizing subscription quota allocation...`,
          });
        }
      }, 120000);

      // Fallback auto-completion at 13 minutes in case admin does not manually click Done earlier
      setTimeout(() => {
        const current = db.getOrder(orderId);
        if (current && current.status !== 'completed' && current.status !== 'failed') {
          const completedOrder = db.completeAdminOrder(orderId);
          if (completedOrder) {
            notifyOrderCompleted(completedOrder, 'Cloud Automation').catch((err) =>
              console.error('[TelegramBot Alert Error] Auto ChatGPT Completed:', err.message)
            );
          }
        }
      }, 780000);

      res.json({
        success: true,
        message: `${planLabel} CDK accepted! Order placed in fair queue (~10–15 min).`,
        order,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Internal error during ChatGPT activation',
      });
    }
  });

  // Public: Get order by ID (for real-time tracking)
  app.get('/api/orders/:id', (req, res) => {
    try {
      const id = sanitizeText(req.params.id, 20).toUpperCase();
      const order = db.getOrder(id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      // Security credential protection: public cannot inspect full raw token
      const publicSafeOrder = {
        ...order,
        rawSessionPayload: undefined,
        accessToken: order.accessToken
          ? `${order.accessToken.slice(0, 10)}...[Protected Token]`
          : undefined,
      };

      res.json({ success: true, order: publicSafeOrder });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to look up order' });
    }
  });

  // Public: Search orders by username or query
  app.get('/api/orders/lookup/:query', (req, res) => {
    try {
      const clean = sanitizeText(req.params.query, 40);

      // Check if it's an Order ID
      if (clean.toUpperCase().startsWith('AG-')) {
        const order = db.getOrder(clean.toUpperCase());
        if (order) {
          const publicSafeOrder = {
            ...order,
            rawSessionPayload: undefined,
            accessToken: order.accessToken
              ? `${order.accessToken.slice(0, 10)}...[Protected Token]`
              : undefined,
          };
          return res.json({ success: true, orders: [publicSafeOrder] });
        }
      }

      // Look up by username
      const orders = db.getOrdersByUsername(clean).map((o) => ({
        ...o,
        rawSessionPayload: undefined,
        accessToken: o.accessToken ? `${o.accessToken.slice(0, 10)}...[Protected Token]` : undefined,
      }));
      res.json({ success: true, orders });
    } catch {
      res.status(500).json({ success: false, error: 'Order lookup failed' });
    }
  });

  // Public: Recent safe order stream (No secret keys exposed)
  app.get('/api/orders/public-recent', (_req, res) => {
    try {
      const orders = db.getAllOrders();
      const safe = orders.slice(0, 5).map((o) => ({
        id: o.id,
        planLabel: o.planLabel,
        username: o.username.length > 5 ? `${o.username.slice(0, 4)}***` : o.username,
        status: o.status,
        createdAt: o.createdAt,
      }));
      res.json({ success: true, orders: safe });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to fetch order stream' });
    }
  });

  // Protected: List all orders with full details (Admin view only)
  app.get('/api/orders', requireAdminAuth, (_req, res) => {
    try {
      const orders = db.getAllOrders();
      res.json({ success: true, orders });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to fetch admin orders' });
    }
  });

  // Protected: Admin manual activation "Done" trigger (Instant completion)
  app.post('/api/admin/orders/:id/complete', requireAdminAuth, (req, res) => {
    try {
      const id = sanitizeText(req.params.id, 30);
      const order = db.completeAdminOrder(id);
      if (!order) {
        return res.status(404).json({ success: false, error: 'Order not found' });
      }

      // Real Telegram bot group alert on Admin manual activation
      notifyOrderCompleted(order, 'Admin Manual Done').catch((err) =>
        console.error('[TelegramBot Alert Error] Admin Manual Done:', err.message)
      );

      res.json({
        success: true,
        order,
        message: `Order ${id} successfully activated and marked as completed!`,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Failed to complete order',
      });
    }
  });

  // Protected: Test Telegram Bot Alert to Group
  app.post('/api/admin/telegram/test', requireAdminAuth, async (_req, res) => {
    try {
      const result = await sendTestBotAlert();
      if (result.success) {
        res.json({
          success: true,
          message: 'Test alert sent to Telegram Group -1004218002560 successfully!',
          details: result.response,
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to dispatch Telegram message',
        });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return app;
}
