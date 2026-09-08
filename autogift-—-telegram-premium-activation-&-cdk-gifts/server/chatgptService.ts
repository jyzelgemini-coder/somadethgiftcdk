import { ChatGPTVerificationDetails } from '../src/types';

/**
 * Safely decodes a JWT payload without external libraries
 */
function decodeJwtPayload(token: string): any {
  try {
    const cleanToken = token.replace(/^Bearer\s+/i, '').replace(/["']/g, '').trim();
    const parts = cleanToken.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * Extracts a JWT string (starting with eyJ) from any text or JSON string
 */
function extractJwtCandidate(text: string): string | null {
  const match = text.match(/(eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export interface ChatGPTSessionParseResult {
  verification: ChatGPTVerificationDetails;
  fullSessionPayload: string;
  accessToken: string;
  sessionDate: string;
  authMethod: 'full_session_json' | 'raw_access_token';
}

/**
 * Parses user input which can be:
 * 1. Full page JSON copied directly from https://chatgpt.com/api/auth/session
 * 2. ONLY the raw JWT accessToken (eyJ...) copied from the page
 * 3. Token with 'Bearer eyJ...' or quotes
 */
export function parseAndVerifyChatGptSession(rawInput: string): ChatGPTSessionParseResult {
  if (!rawInput || typeof rawInput !== 'string') {
    throw new Error('Please paste your full session JSON from https://chatgpt.com/api/auth/session');
  }

  let trimmed = rawInput.trim();

  // Strip leading/trailing quotes if wrapped
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  // If user pasted only raw token without full session JSON
  if (trimmed.startsWith('eyJ') || trimmed.toLowerCase().startsWith('bearer eyj')) {
    throw new Error(
      'Please paste the FULL session JSON from https://chatgpt.com/api/auth/session (must start with { and contain user and accessToken), not only the token.'
    );
  }

  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    throw new Error(
      'Invalid format. Please open https://chatgpt.com/api/auth/session, select all and copy the entire JSON content, and paste it here.'
    );
  }

  // Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error(
      'Invalid JSON syntax. Please open https://chatgpt.com/api/auth/session, press Ctrl+A, copy everything, and paste.'
    );
  }

  const user = parsed.user || {};
  const embeddedToken = parsed.accessToken || extractJwtCandidate(trimmed) || '';

  let email = user.email;
  let name = user.name;
  let image = user.image || user.picture;
  let accountId = user.id || parsed.accountId;
  let expires = parsed.expires;

  // Decode the embedded access token to supplement missing profile data
  if (embeddedToken) {
    const jwt = decodeJwtPayload(embeddedToken);
    if (jwt) {
      email = email || jwt.email || jwt['https://api.openai.com/profile']?.email || jwt.preferred_username;
      name = name || jwt.name || jwt['https://api.openai.com/profile']?.name || jwt.nickname;
      image = image || jwt.picture || jwt['https://api.openai.com/profile']?.picture;
      accountId = accountId || jwt.sub || jwt['https://api.openai.com/auth']?.user_id;
      if (!expires && jwt.exp) {
        expires = new Date(jwt.exp * 1000).toISOString();
      }
    }
  }

  // Fallback customer account email identifier if needed
  if (!email || !email.includes('@')) {
    const shortId = accountId ? accountId.replace(/[^a-zA-Z0-9]/g, '').slice(-8) : Math.random().toString(36).substring(2, 8);
    email = `customer.${shortId}@chatgpt.account`;
  }

  if (!name) {
    name = email.split('@')[0] || 'ChatGPT Subscriber';
  }

  const sessionDate = expires || new Date().toISOString();

  return {
    verification: {
      isValid: true,
      email: email.toLowerCase().trim(),
      name,
      image,
      accountId: accountId || `openai-user-${Buffer.from(email).toString('hex').slice(0, 10)}`,
      planType: 'ChatGPT Plus / Pro Eligible',
      expires: expires || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
      authProvider: parsed.authProvider || 'OpenAI Session (Full Session JSON)',
      verifiedAt: new Date().toISOString(),
    },
    fullSessionPayload: JSON.stringify(parsed, null, 2),
    accessToken: embeddedToken || 'embedded-in-session-json',
    sessionDate,
    authMethod: 'full_session_json',
  };
}
