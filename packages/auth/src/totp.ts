/**
 * TOTP / 2FA support.
 *
 * Provides:
 * - TOTP enrollment with QR code URI generation
 * - TOTP verification with time-based window
 * - Backup code generation and verification
 * - Recovery code management
 */

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export interface TOTPConfig {
  /** TOTP secret (base32 encoded) */
  secret: string;
  /** Issuer name (displayed in authenticator app) */
  issuer: string;
  /** Account name (email or username) */
  account: string;
  /** Number of digits (default: 6) */
  digits?: number;
  /** Time step in seconds (default: 30) */
  step?: number;
  /** Hash algorithm (default: 'sha1') */
  algorithm?: 'sha1' | 'sha256' | 'sha512';
}

const DEFAULT_DIGITS = 6;
const DEFAULT_STEP = 30;
const DEFAULT_ALGORITHM = 'sha1';
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_LENGTH = 8;

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Generate a random TOTP secret in base32 encoding.
 */
export function generateTOTPSecret(length = 20): string {
  const bytes = randomBytes(length);
  let secret = '';
  for (let i = 0; i < bytes.length; i++) {
    secret += BASE32_CHARS[(bytes[i] >> 3) & 0x1f];
    secret += BASE32_CHARS[((bytes[i] & 0x07) << 2) | ((bytes[i + 1] ?? 0) >> 6) & 0x03];
  }
  return secret.slice(0, Math.floor(length * 8 / 5));
}

/**
 * Decode a base32 string to a Buffer.
 */
function base32Decode(input: string): Buffer {
  const cleaned = input.replace(/=+$/, '').toUpperCase();
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (const char of cleaned) {
    const value = BASE32_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 5) | value;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bytes.push((buffer >> (bitsLeft - 8)) & 0xff);
      bitsLeft -= 8;
    }
  }

  return Buffer.from(bytes);
}

/**
 * Generate the TOTP code for a given time and secret.
 */
export function generateTOTPCode(
  secret: string,
  time: number = Date.now(),
  config?: Partial<Pick<TOTPConfig, 'digits' | 'step' | 'algorithm'>>,
): string {
  const step = config?.step ?? DEFAULT_STEP;
  const digits = config?.digits ?? DEFAULT_DIGITS;
  const algorithm = config?.algorithm ?? DEFAULT_ALGORITHM;

  const counter = Math.floor(time / 1000 / step);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const key = base32Decode(secret);
  const hmac = createHmac(algorithm, key).update(counterBuffer).digest();

  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const otp = code % Math.pow(10, digits);
  return otp.toString().padStart(digits, '0');
}

/**
 * Verify a TOTP code against the current time window.
 * Allows a configurable window of time steps before and after.
 */
export function verifyTOTP(
  secret: string,
  token: string,
  time: number = Date.now(),
  window = 1,
  config?: Partial<Pick<TOTPConfig, 'digits' | 'step' | 'algorithm'>>,
): boolean {
  const step = config?.step ?? DEFAULT_STEP;
  const digits = config?.digits ?? DEFAULT_DIGITS;

  if (token.length !== digits) return false;

  for (let i = -window; i <= window; i++) {
    const expectedCode = generateTOTPCode(secret, time + i * step * 1000, config);
    if (timingSafeEqual(Buffer.from(token), Buffer.from(expectedCode))) {
      return true;
    }
  }

  return false;
}

/**
 * Generate the otpauth:// URI for QR code enrollment.
 */
export function generateTOTPURI(config: TOTPConfig): string {
  const issuer = encodeURIComponent(config.issuer);
  const account = encodeURIComponent(config.account);
  const secret = config.secret.replace(/\s/g, '');
  const digits = config.digits ?? DEFAULT_DIGITS;
  const step = config.step ?? DEFAULT_STEP;
  const algorithm = config.algorithm ?? DEFAULT_ALGORITHM;

  const params = new URLSearchParams({
    secret,
    issuer: config.issuer,
    algorithm,
    digits: String(digits),
    period: String(step),
  });

  return `otpauth://totp/${issuer}:${account}?${params}`;
}

/**
 * TOTP enrollment result.
 */
export interface TOTPEnrollment {
  secret: string;
  uri: string;
  backupCodes: string[];
}

/**
 * Enroll a new TOTP device — generates secret, URI, and backup codes.
 */
export function enrollTOTP(issuer: string, account: string): TOTPEnrollment {
  const secret = generateTOTPSecret();
  const uri = generateTOTPURI({ secret, issuer, account });
  const backupCodes = generateBackupCodes();
  return { secret, uri, backupCodes };
}

/**
 * Generate backup/recovery codes.
 */
export function generateBackupCodes(count = BACKUP_CODE_COUNT, length = BACKUP_CODE_LENGTH): string[] {
  const codes: string[] = [];
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(length);
    let code = '';
    for (let j = 0; j < length; j++) {
      code += chars[bytes[j] % chars.length];
    }
    codes.push(code);
  }
  return codes;
}

/**
 * Verify a backup code against a list (case-insensitive).
 * Returns the index of the used code, or -1 if not found.
 */
export function verifyBackupCode(input: string, codes: string[]): number {
  const normalized = input.trim().toUpperCase();
  const inputBuf = Buffer.from(normalized);
  for (let i = 0; i < codes.length; i++) {
    const codeBuf = Buffer.from(codes[i].toUpperCase());
    if (inputBuf.length !== codeBuf.length) continue;
    if (timingSafeEqual(inputBuf, codeBuf)) {
      return i;
    }
  }
  return -1;
}

/**
 * Consume a backup code — removes it from the list.
 * Returns a new array without the consumed code.
 */
export function consumeBackupCode(input: string, codes: string[]): { remaining: string[]; consumed: boolean } {
  const index = verifyBackupCode(input, codes);
  if (index === -1) {
    return { remaining: codes, consumed: false };
  }
  return {
    remaining: codes.filter((_, i) => i !== index),
    consumed: true,
  };
}
