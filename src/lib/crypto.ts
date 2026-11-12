import crypto from 'crypto';

const PBKDF2_ITERATIONS = 100000;
const PBKDF2_KEYLEN = 64;
const PBKDF2_DIGEST = 'sha512';

function getSessionSecret(): string {
  return (
    process.env.SESSION_SECRET ||
    'sreu-utc-institutional-secret-key-2026-change-in-production-9f8e7d6c5b4a'
  );
}

/**
 * Generates a salted PBKDF2-SHA512 password hash.
 * Format: pbkdf2$100000$<hex-salt>$<hex-hash>
 */
export function hashPassword(plainPassword: string, fixedSaltHex?: string): string {
  const salt = fixedSaltHex || crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto
    .pbkdf2Sync(plainPassword, salt, PBKDF2_ITERATIONS, PBKDF2_KEYLEN, PBKDF2_DIGEST)
    .toString('hex');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt}$${derivedKey}`;
}

/**
 * Constant-time verification of a plain password against a stored PBKDF2-SHA512 hash.
 */
export function verifyPassword(plainPassword: string, storedHash: string): boolean {
  try {
    const parts = storedHash.split('$');
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false;
    }
    const iterations = parseInt(parts[1], 10);
    const salt = parts[2];
    const originalHashHex = parts[3];

    if (!iterations || !salt || !originalHashHex) {
      return false;
    }

    const derivedHex = crypto
      .pbkdf2Sync(plainPassword, salt, iterations, PBKDF2_KEYLEN, PBKDF2_DIGEST)
      .toString('hex');

    const a = Buffer.from(originalHashHex, 'hex');
    const b = Buffer.from(derivedHex, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface SignedTokenPayload {
  userId: string;
  username: string;
  role: string;
  exp: number;
}

export function signSessionToken(payload: Omit<SignedTokenPayload, 'exp'>, ttlSeconds = 60 * 60 * 12): string {
  const fullPayload: SignedTokenPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const payloadBase64 = Buffer.from(JSON.stringify(fullPayload), 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadBase64)
    .digest('base64url');
  return `${payloadBase64}.${signature}`;
}

export function verifySessionToken(token: string): SignedTokenPayload | null {
  try {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', getSessionSecret())
      .update(payloadBase64)
      .digest('base64url');

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf-8')) as SignedTokenPayload;
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

