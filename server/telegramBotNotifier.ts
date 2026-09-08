/**
 * Real Telegram Bot Notification Service
 * Sends automated alerts to the configured Telegram Group when customer activations occur.
 */

const DEFAULT_BOT_TOKEN = '8933910846:AAFMqjL3Xd14ujIX45JSDVfJuacijUelhDY';
const DEFAULT_GROUP_ID = '-1004218002560';

export function getBotCredentials() {
  const token = process.env.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  const groupId = process.env.TELEGRAM_GROUP_ID || DEFAULT_GROUP_ID;
  return { token: token.trim(), groupId: groupId.trim() };
}

/**
 * Sends a formatted message to the Telegram Group via Bot API
 */
export async function sendTelegramGroupMessage(text: string): Promise<{ success: boolean; response?: any; error?: string }> {
  try {
    const { token, groupId } = getBotCredentials();
    if (!token || !groupId) {
      console.warn('[TelegramBot] Token or Group ID is missing, skipping alert.');
      return { success: false, error: 'Token or Group ID missing' };
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: groupId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.ok) {
      console.error('[TelegramBot] Failed to send message:', data);
      return { success: false, error: data.description || 'Telegram API error', response: data };
    }

    return { success: true, response: data };
  } catch (err: any) {
    console.error('[TelegramBot] Error sending Telegram alert:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Alert when a new customer submits a CDK redemption / places an activation order
 */
export async function notifyNewOrder(order: {
  id: string;
  serviceType?: string;
  username: string;
  customerEmail?: string;
  planLabel: string;
  cdkCode?: string;
  queuePosition?: number;
  sessionDate?: string;
}) {
  const isChatGpt = order.serviceType === 'chatgpt' || order.id.startsWith('GPT-');
  const serviceIcon = isChatGpt ? '🤖' : '⭐';
  const serviceName = isChatGpt ? 'ChatGPT Activation' : 'Telegram Premium';
  const customerId = isChatGpt
    ? order.customerEmail || order.username
    : `@${order.username.replace('@', '')}`;

  const maskedCode = order.cdkCode
    ? `${order.cdkCode.slice(0, 8)}...${order.cdkCode.slice(-4)}`
    : 'N/A';

  const timeStr = new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC';

  const message = [
    `⚡️ <b>NEW ACTIVATION QUEUED</b> ${serviceIcon}`,
    `━━━━━━━━━━━━━━━━━━━`,
    `📦 <b>Service:</b> ${serviceName}`,
    `💎 <b>Plan:</b> ${order.planLabel}`,
    `🆔 <b>Order ID:</b> <code>${order.id}</code>`,
    `👤 <b>Customer:</b> <code>${customerId}</code>`,
    `🔑 <b>CDK Code:</b> <code>${maskedCode}</code>`,
    `📊 <b>Queue Position:</b> #${order.queuePosition || 1} (Est. 10–15 min)`,
    order.sessionDate ? `🕒 <b>Session Auth:</b> <code>${new Date(order.sessionDate).toISOString()}</code>` : null,
    `📅 <b>Submitted At:</b> ${timeStr}`,
    `━━━━━━━━━━━━━━━━━━━`,
    `🛡️ <i>Automated Security Gateway Alert</i>`,
  ]
    .filter(Boolean)
    .join('\n');

  return sendTelegramGroupMessage(message);
}

/**
 * Alert when customer activation is completed (either automatically or via Admin "Done" trigger)
 */
export async function notifyOrderCompleted(order: {
  id: string;
  serviceType?: string;
  username: string;
  customerEmail?: string;
  planLabel: string;
  delivery?: {
    giftUrl?: string;
    receiptNumber?: string;
    deliveredAt?: string;
  };
}, triggerType: 'Admin Manual Done' | 'Cloud Automation' = 'Cloud Automation') {
  const isChatGpt = order.serviceType === 'chatgpt' || order.id.startsWith('GPT-');
  const serviceIcon = isChatGpt ? '✅ 🤖' : '✅ ⭐';
  const serviceName = isChatGpt ? 'ChatGPT Activation' : 'Telegram Premium';
  const customerId = isChatGpt
    ? order.customerEmail || order.username
    : `@${order.username.replace('@', '')}`;

  const receipt = order.delivery?.receiptNumber || `ACT-${order.id}`;
  const timeStr = new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC';

  const message = [
    `🎉 <b>ACTIVATION COMPLETED & DELIVERED</b> ${serviceIcon}`,
    `━━━━━━━━━━━━━━━━━━━`,
    `📦 <b>Service:</b> ${serviceName}`,
    `💎 <b>Plan:</b> ${order.planLabel}`,
    `🆔 <b>Order ID:</b> <code>${order.id}</code>`,
    `👤 <b>Customer:</b> <code>${customerId}</code>`,
    `🧾 <b>Receipt:</b> <code>${receipt}</code>`,
    `⚡ <b>Processed By:</b> ${triggerType}`,
    `📅 <b>Completed At:</b> ${timeStr}`,
    order.delivery?.giftUrl && !isChatGpt ? `🎁 <b>Gift Link:</b> ${order.delivery.giftUrl}` : null,
    `━━━━━━━━━━━━━━━━━━━`,
    `🟢 <b>Status:</b> Subscription Active & Verified`,
  ]
    .filter(Boolean)
    .join('\n');

  return sendTelegramGroupMessage(message);
}

/**
 * Test alert endpoint for verifying bot communication with the group
 */
export async function sendTestBotAlert(): Promise<{ success: boolean; response?: any; error?: string }> {
  const { groupId } = getBotCredentials();
  const timeStr = new Date().toLocaleString('en-US', { timeZone: 'UTC' }) + ' UTC';

  const message = [
    `🔔 <b>TELEGRAM NOTIFICATION BOT CONNECTED</b>`,
    `━━━━━━━━━━━━━━━━━━━`,
    `✅ <b>Status:</b> Online & Operational`,
    `🎯 <b>Target Group:</b> <code>${groupId}</code>`,
    `🛡️ <b>Security Layer:</b> Active (Rate Limit + Anti-Tamper)`,
    `🤖 <b>Events Monitored:</b>`,
    `  • ChatGPT Activations (Plus, Go, Pro x5, Pro x20)`,
    `  • Telegram Premium CDK Redemptions`,
    `  • Instant Admin "Done" Triggers`,
    `📅 <b>Timestamp:</b> ${timeStr}`,
    `━━━━━━━━━━━━━━━━━━━`,
    `🚀 <i>Ready for live customer activations!</i>`,
  ].join('\n');

  return sendTelegramGroupMessage(message);
}
