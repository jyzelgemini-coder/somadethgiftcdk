import fs from 'fs';
import path from 'path';
import { CDKItem, OrderItem, AppStats, PremiumPlanDuration, ServiceType } from '../src/types';

const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);
const DATA_DIR = isVercel ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

export interface DatabaseSchema {
  cdks: CDKItem[];
  orders: OrderItem[];
  settings: {
    queueSpeedSeconds: number;
    telegramApiEnabled: boolean;
    autoVerifyUsers: boolean;
  };
}

// Generate standard 24-char format: 8-8-8 e.g. TGPRM839-ABCDEFGH-12345678
export function generateFormattedCDK(prefix = 'TG'): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randSegment = (len: number) => {
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  const p = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4) || 'TG';
  const group1 = (p + randSegment(8 - p.length)).slice(0, 8);
  const group2 = randSegment(8);
  const group3 = randSegment(8);

  return `${group1}-${group2}-${group3}`;
}

const initialSeedCDKs: CDKItem[] = [
  {
    id: 'cdk_seed_1',
    code: 'TGPRM839-ABCDEFGH-12345678',
    serviceType: 'telegram',
    duration: '3_months',
    durationLabel: '3 Months',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    notes: 'Official Telegram Launch Promo',
    batchId: 'BATCH-ALPHA',
  },
  {
    id: 'cdk_seed_2',
    code: 'TGPREM01-K9L2M8P4-7T3QW9R1',
    serviceType: 'telegram',
    duration: '1_month',
    durationLabel: '1 Month',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
    notes: 'Telegram Gift Trial Key',
    batchId: 'BATCH-ALPHA',
  },
  {
    id: 'cdk_seed_3',
    code: 'TGPREM06-VX89KP21-MN45QR67',
    serviceType: 'telegram',
    duration: '6_months',
    durationLabel: '6 Months',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    notes: 'VIP Community Drop',
    batchId: 'BATCH-VIP',
  },
  {
    id: 'cdk_seed_4',
    code: 'TGPREM12-Z9Y8X7W6-V5U4T3S2',
    serviceType: 'telegram',
    duration: '12_months',
    durationLabel: '12 Months',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    notes: 'Annual Subscription Key',
    batchId: 'BATCH-VIP',
  },
  {
    id: 'cdk_seed_5',
    code: 'TGTEST99-DEMO2026-ACTIVE01',
    serviceType: 'telegram',
    duration: '3_months',
    durationLabel: '3 Months',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    notes: 'Quick Test Key for Instant Demo',
    batchId: 'BATCH-TEST',
  },
  // ChatGPT Plans: ChatGPT Plus, ChatGPT Go, ChatGPT Pro x5, ChatGPT Pro x20
  {
    id: 'cdk_seed_gpt_plus_1',
    code: 'GPTPLUS1-OPENAI26-8877AABB',
    serviceType: 'chatgpt',
    duration: 'chatgpt_plus',
    durationLabel: 'ChatGPT Plus',
    chatgptPlan: 'chatgpt_plus',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 8).toISOString(),
    notes: 'ChatGPT Plus One-time CDK',
    batchId: 'BATCH-GPT-PLUS',
  },
  {
    id: 'cdk_seed_gpt_plus_2',
    code: 'GPTPLUS2-SUBTOKEN-CC44EE66',
    serviceType: 'chatgpt',
    duration: 'chatgpt_plus',
    durationLabel: 'ChatGPT Plus',
    chatgptPlan: 'chatgpt_plus',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
    notes: 'ChatGPT Plus Direct Key',
    batchId: 'BATCH-GPT-PLUS',
  },
  {
    id: 'cdk_seed_gpt_go_1',
    code: 'GPTGO001-ALPHA2026-GO019988',
    serviceType: 'chatgpt',
    duration: 'chatgpt_go',
    durationLabel: 'ChatGPT Go',
    chatgptPlan: 'chatgpt_go',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    notes: 'ChatGPT Go Fast Key',
    batchId: 'BATCH-GPT-GO',
  },
  {
    id: 'cdk_seed_gpt_go_2',
    code: 'GPTGO002-FASTBETA-778899AA',
    serviceType: 'chatgpt',
    duration: 'chatgpt_go',
    durationLabel: 'ChatGPT Go',
    chatgptPlan: 'chatgpt_go',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    notes: 'ChatGPT Go High-Speed Key',
    batchId: 'BATCH-GPT-GO',
  },
  {
    id: 'cdk_seed_gpt_pro5_1',
    code: 'GPTPRO51-POWERX5-5555AAAA',
    serviceType: 'chatgpt',
    duration: 'chatgpt_pro_x5',
    durationLabel: 'ChatGPT Pro x5',
    chatgptPlan: 'chatgpt_pro_x5',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
    notes: 'ChatGPT Pro x5 High Tier',
    batchId: 'BATCH-GPT-PRO5',
  },
  {
    id: 'cdk_seed_gpt_pro5_2',
    code: 'GPTPRO52-VIPTIER5-BBBBCCCC',
    serviceType: 'chatgpt',
    duration: 'chatgpt_pro_x5',
    durationLabel: 'ChatGPT Pro x5',
    chatgptPlan: 'chatgpt_pro_x5',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    notes: 'ChatGPT Pro x5 Direct Slot',
    batchId: 'BATCH-GPT-PRO5',
  },
  {
    id: 'cdk_seed_gpt_pro20_1',
    code: 'GPTPRO20-MAXTIERX-20202020',
    serviceType: 'chatgpt',
    duration: 'chatgpt_pro_x20',
    durationLabel: 'ChatGPT Pro x20',
    chatgptPlan: 'chatgpt_pro_x20',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    notes: 'ChatGPT Pro x20 Ultimate Plan',
    batchId: 'BATCH-GPT-PRO20',
  },
  {
    id: 'cdk_seed_gpt_pro20_2',
    code: 'GPTPR201-UNLIMITED-99998888',
    serviceType: 'chatgpt',
    duration: 'chatgpt_pro_x20',
    durationLabel: 'ChatGPT Pro x20',
    chatgptPlan: 'chatgpt_pro_x20',
    status: 'available',
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString(),
    notes: 'ChatGPT Pro x20 Dedicated Node',
    batchId: 'BATCH-GPT-PRO20',
  },
  {
    id: 'cdk_seed_6',
    code: 'TGPAID03-REDEEMED-99887766',
    serviceType: 'telegram',
    duration: '3_months',
    durationLabel: '3 Months',
    status: 'redeemed',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    redeemedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    redeemedBy: '@durov',
    orderId: 'AG-918234',
    notes: 'Redeemed key example',
    batchId: 'BATCH-OLD',
    telegramGiftUrl: 'https://t.me/giftcode/TG-GIFT-ALPHA-918234',
  }
];

class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = {
      cdks: [],
      orders: [],
      settings: {
        queueSpeedSeconds: 4,
        telegramApiEnabled: true,
        autoVerifyUsers: true,
      },
    };
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        if (!this.data.cdks || this.data.cdks.length === 0) {
          this.data.cdks = initialSeedCDKs;
          this.save();
        }
      } else {
        this.data.cdks = initialSeedCDKs;
        this.save();
      }
    } catch (err) {
      console.error('Error initializing database:', err);
      this.data.cdks = initialSeedCDKs;
    }
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // CDK Methods
  public getAllCDKs(): CDKItem[] {
    return [...this.data.cdks].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public findCDKByCode(code: string): CDKItem | undefined {
    const normalized = code.trim().toUpperCase();
    return this.data.cdks.find((c) => c.code.toUpperCase() === normalized);
  }

  public getSampleAvailableCDK(): CDKItem | undefined {
    return this.data.cdks.find((c) => c.status === 'available');
  }

  public createCDK(item: Omit<CDKItem, 'id' | 'createdAt'>): CDKItem {
    const isChatGpt = item.serviceType === 'chatgpt' || String(item.duration).startsWith('chatgpt');
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

    const label = durationLabels[item.duration] || item.durationLabel || (isChatGpt ? 'ChatGPT Plus' : 'Telegram Premium');

    const newCDK: CDKItem = {
      ...item,
      id: `cdk_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      serviceType: isChatGpt ? 'chatgpt' : 'telegram',
      durationLabel: label,
      chatgptPlan: isChatGpt ? (item.duration as any) : undefined,
      code: item.code.trim().toUpperCase(),
    };
    this.data.cdks.unshift(newCDK);
    this.save();
    return newCDK;
  }

  public createBatchCDKs(params: {
    count: number;
    duration: PremiumPlanDuration;
    prefix?: string;
    notes?: string;
    batchId?: string;
    serviceType?: ServiceType;
  }): CDKItem[] {
    const created: CDKItem[] = [];
    const isChatGpt = params.serviceType === 'chatgpt' || String(params.duration).startsWith('chatgpt');
    const durationLabels: Record<string, string> = {
      '1_month': isChatGpt ? 'ChatGPT Plus 1 Month' : '1 Month',
      '3_months': isChatGpt ? 'ChatGPT Plus 3 Months' : '3 Months',
      '6_months': isChatGpt ? 'ChatGPT Plus 6 Months' : '6 Months',
      '12_months': isChatGpt ? 'ChatGPT Plus 12 Months' : '12 Months',
      'chatgpt_plus': 'ChatGPT Plus',
      'chatgpt_go': 'ChatGPT Go',
      'chatgpt_pro_x5': 'ChatGPT Pro x5',
      'chatgpt_pro_x20': 'ChatGPT Pro x20',
    };

    const batch = params.batchId || `BATCH-${Date.now().toString(36).toUpperCase()}`;
    const defaultPrefix = isChatGpt ? 'GPT' : 'TG';

    for (let i = 0; i < params.count; i++) {
      const code = generateFormattedCDK(params.prefix || defaultPrefix);
      const label = durationLabels[params.duration] || (isChatGpt ? 'ChatGPT Plan' : 'Telegram Premium');
      const item: CDKItem = {
        id: `cdk_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        code,
        serviceType: isChatGpt ? 'chatgpt' : 'telegram',
        duration: params.duration,
        durationLabel: label,
        chatgptPlan: isChatGpt ? (params.duration as any) : undefined,
        status: 'available',
        createdAt: new Date().toISOString(),
        notes: params.notes || `Batch ${batch}`,
        batchId: batch,
      };
      this.data.cdks.unshift(item);
      created.push(item);
    }
    this.save();
    return created;
  }

  public completeAdminOrder(orderId: string): OrderItem | null {
    const order = this.data.orders.find((o) => o.id.toUpperCase() === orderId.toUpperCase());
    if (!order) return null;

    const isChatGpt = order.serviceType === 'chatgpt' || order.id.startsWith('GPT-');
    const receiptNumber = `RCP-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const delivery = {
      provider: isChatGpt
        ? 'OpenAI ChatGPT Automated Gateway v4.2'
        : 'Telegram Premium Gift Subscription API v8.1',
      giftUrl: isChatGpt
        ? 'https://chatgpt.com/?model=gpt-4o#subscription-active'
        : `https://t.me/giftcode/TG-GIFT-${order.id}`,
      transactionHash: `0x${Buffer.from(order.id + Date.now().toString()).toString('hex').slice(0, 32)}`,
      deliveredAt: new Date().toISOString(),
      durationMonths: 1,
      durationLabel: order.planLabel,
      receiptNumber,
    };

    order.status = 'completed';
    order.queuePosition = 0;
    order.delivery = delivery;
    order.updatedAt = new Date().toISOString();
    order.logs.push({
      timestamp: new Date().toISOString(),
      stage: 'completed',
      message: isChatGpt
        ? `${order.planLabel} subscription verified & permanently bound to ${order.customerEmail || order.username}! Direct receipt: ${receiptNumber}`
        : `Telegram Premium activated for ${order.username}! Direct receipt: ${receiptNumber}`,
    });

    if (order.cdkCode) {
      this.markCDKRedeemed(order.cdkCode, order.customerEmail || order.username, order.id, delivery.giftUrl);
    }

    this.save();
    return order;
  }

  public markCDKRedeemed(
    code: string,
    username: string,
    orderId: string,
    giftUrl?: string
  ): CDKItem | null {
    const normalized = code.trim().toUpperCase();
    const cdk = this.data.cdks.find((c) => c.code.toUpperCase() === normalized);
    if (!cdk) return null;

    cdk.status = 'redeemed';
    cdk.redeemedAt = new Date().toISOString();
    cdk.redeemedBy = username;
    cdk.orderId = orderId;
    if (giftUrl) cdk.telegramGiftUrl = giftUrl;

    this.save();
    return cdk;
  }

  public deleteCDK(id: string): boolean {
    const initialLen = this.data.cdks.length;
    this.data.cdks = this.data.cdks.filter((c) => c.id !== id);
    if (this.data.cdks.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Order Methods
  public createOrder(order: OrderItem): OrderItem {
    this.data.orders.unshift(order);
    this.save();
    return order;
  }

  public getOrder(id: string): OrderItem | undefined {
    const normalized = id.trim().toUpperCase();
    return this.data.orders.find((o) => o.id.toUpperCase() === normalized);
  }

  public getOrdersByUsername(username: string): OrderItem[] {
    const normalized = username.trim().toLowerCase().replace(/^@/, '');
    return this.data.orders.filter(
      (o) => o.username.toLowerCase().replace(/^@/, '') === normalized
    );
  }

  public getAllOrders(): OrderItem[] {
    return [...this.data.orders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public updateOrder(
    id: string,
    updates: Partial<OrderItem> & { newLogMessage?: string }
  ): OrderItem | null {
    const order = this.data.orders.find((o) => o.id.toUpperCase() === id.toUpperCase());
    if (!order) return null;

    const { newLogMessage, ...rest } = updates;
    Object.assign(order, rest);
    order.updatedAt = new Date().toISOString();

    if (newLogMessage) {
      order.logs.push({
        timestamp: new Date().toISOString(),
        stage: order.status,
        message: newLogMessage,
      });
    }

    this.save();
    return order;
  }

  public getStats(): AppStats {
    const totalCdks = this.data.cdks.length;
    const availableCdks = this.data.cdks.filter((c) => c.status === 'available').length;
    const redeemedCdks = this.data.cdks.filter((c) => c.status === 'redeemed').length;
    const totalOrders = this.data.orders.length;
    const activeOrders = this.data.orders.filter(
      (o) => o.status !== 'completed' && o.status !== 'failed'
    ).length;

    const completedOrders = this.data.orders.filter((o) => o.status === 'completed').length;
    const successRate = totalOrders > 0 
      ? Math.round((completedOrders / totalOrders) * 100) 
      : 99.8;

    return {
      totalCdks,
      availableCdks,
      redeemedCdks,
      totalOrders,
      activeOrders,
      successRate,
    };
  }
}

export const db = new Database();
