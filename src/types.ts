export type PremiumPlanDuration = 
  | '1_month' 
  | '3_months' 
  | '6_months' 
  | '12_months'
  | 'chatgpt_plus'
  | 'chatgpt_go'
  | 'chatgpt_pro_x5'
  | 'chatgpt_pro_x20';

export type ChatGPTPlanType = 'chatgpt_plus' | 'chatgpt_go' | 'chatgpt_pro_x5' | 'chatgpt_pro_x20';

export type ServiceType = 'telegram' | 'chatgpt';

export interface ChatGPTVerificationDetails {
  isValid: boolean;
  email: string;
  name: string;
  image?: string;
  accountId: string;
  planType: string;
  expires?: string;
  authProvider?: string;
  verifiedAt: string;
}

export interface CDKItem {
  id: string;
  code: string; // e.g. "TGPRM839-ABCDEFGH-12345678" or 24-char formatted
  serviceType?: ServiceType;
  duration: PremiumPlanDuration;
  durationLabel: string;
  chatgptPlan?: ChatGPTPlanType;
  status: 'available' | 'redeemed' | 'revoked';
  createdAt: string;
  redeemedAt?: string;
  redeemedBy?: string; // telegram @username or customer email
  targetEmail?: string;
  orderId?: string;
  notes?: string;
  batchId?: string;
  telegramGiftUrl?: string;
}

export type OrderStatus = 
  | 'verifying_user' 
  | 'in_queue' 
  | 'dispatching_api' 
  | 'completed' 
  | 'failed';

export interface OrderVerificationDetails {
  isValid: boolean;
  username: string;
  displayName: string;
  isPremium: boolean;
  avatarSeed: string;
  avatarUrl?: string;
  bio?: string;
  subscribers?: string;
  isVerifiedBadge?: boolean;
  isRealTelegramAccount?: boolean;
  verificationSource: string;
  verifiedAt: string;
}

export interface OrderDeliveryDetails {
  provider: string; // e.g. "Telegram Premium Gift Subscription API v8.1" or "OpenAI ChatGPT Plus Subscription Gateway"
  giftUrl: string; // e.g. "https://t.me/giftcode/TG-GIFT-..." or "https://chatgpt.com/#plus-active"
  transactionHash: string;
  deliveredAt: string;
  durationMonths: number;
  durationLabel: string;
  receiptNumber: string;
}

export interface OrderLog {
  timestamp: string;
  stage: OrderStatus;
  message: string;
}

export interface OrderItem {
  id: string; // e.g. "AG-748291"
  serviceType?: ServiceType;
  type: 'cdk_redemption' | 'direct_purchase';
  username: string; // telegram username with @ or customer email
  customerEmail?: string;
  plan: PremiumPlanDuration;
  planLabel: string;
  amountUsd: number;
  cdkCode?: string;
  paymentMethod: 'cdk_key' | 'credit_card' | 'crypto_ton' | 'crypto_usdt' | 'telegram_stars';
  paymentStatus: 'paid' | 'pending' | 'failed';
  status: OrderStatus;
  queuePosition: number;
  estimatedWaitSeconds: number;
  verification: OrderVerificationDetails;
  chatgptVerification?: ChatGPTVerificationDetails;
  chatgptPlan?: ChatGPTPlanType;
  rawSessionPayload?: string;
  accessToken?: string;
  sessionDate?: string;
  delivery?: OrderDeliveryDetails;
  createdAt: string;
  updatedAt: string;
  logs: OrderLog[];
}

export interface AppStats {
  totalCdks: number;
  availableCdks: number;
  redeemedCdks: number;
  totalOrders: number;
  activeOrders: number;
  successRate: number;
}
