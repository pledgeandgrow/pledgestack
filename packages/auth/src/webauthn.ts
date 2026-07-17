/**
 * Passkey / WebAuthn support.
 *
 * Provides:
 * - Passwordless authentication with platform authenticators
 * - Conditional UI mediation
 * - Registration and authentication ceremony helpers
 * - Challenge generation and verification
 */

import { randomBytes } from 'node:crypto';

export interface WebAuthnConfig {
  /** Relying party name */
  rpName: string;
  /** Relying party ID (domain) */
  rpId: string;
  /** Expected origin (e.g. 'https://example.com') */
  origin: string;
  /** Timeout for ceremonies in ms (default: 60000) */
  timeout?: number;
  /** User verification requirement (default: 'preferred') */
  userVerification?: 'required' | 'preferred' | 'discouraged';
}

export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  userId: string;
  createdAt: number;
}

export interface RegistrationOptions {
  userId: string;
  username: string;
  displayName?: string;
  excludeCredentials?: string[];
}

export interface AuthenticationOptions {
  userId?: string;
  allowCredentials?: string[];
}

const DEFAULT_TIMEOUT = 60000;
const DEFAULT_USER_VERIFICATION = 'preferred';

/**
 * Generate a random challenge for WebAuthn ceremonies.
 */
export function generateChallenge(length = 32): string {
  return randomBytes(length).toString('base64url');
}

/**
 * Generate registration options for navigator.credentials.create().
 */
export function generateRegistrationOptions(
  config: WebAuthnConfig,
  options: RegistrationOptions,
): Record<string, unknown> {
  const challenge = generateChallenge();
  const userId = randomBytes(16).toString('base64url');

  return {
    publicKey: {
      challenge,
      rp: {
        name: config.rpName,
        id: config.rpId,
      },
      user: {
        id: userId,
        name: options.username,
        displayName: options.displayName ?? options.username,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: config.userVerification ?? DEFAULT_USER_VERIFICATION,
        residentKey: 'preferred',
        requireResidentKey: false,
      },
      excludeCredentials: (options.excludeCredentials ?? []).map((id) => ({
        type: 'public-key',
        id: id,
      })),
    },
    challenge,
  };
}

/**
 * Generate authentication options for navigator.credentials.get().
 */
export function generateAuthenticationOptions(
  config: WebAuthnConfig,
  options: AuthenticationOptions = {},
): Record<string, unknown> {
  const challenge = generateChallenge();

  return {
    publicKey: {
      challenge,
      rpId: config.rpId,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      userVerification: config.userVerification ?? DEFAULT_USER_VERIFICATION,
      allowCredentials: (options.allowCredentials ?? []).map((id) => ({
        type: 'public-key',
        id: id,
      })),
    },
    challenge,
  };
}

/**
 * Verify a registration response from the authenticator.
 * In a full implementation, this would parse the attestation object
 * and verify the signature against the attestation CA.
 */
export function verifyRegistrationResponse(
  response: any,
  expectedChallenge: string,
  config: WebAuthnConfig,
): WebAuthnCredential | null {
  if (!response || !response.id || !response.response) return null;

  const clientDataJSON = parseClientData(response.response.clientDataJSON);
  if (!clientDataJSON) return null;

  if (clientDataJSON.type !== 'webauthn.create') return null;
  if (clientDataJSON.origin !== config.origin) return null;

  const challenge = extractChallenge(clientDataJSON.challenge);
  if (challenge !== expectedChallenge) return null;

  return {
    id: response.id,
    publicKey: response.response.attestationObject ?? response.response.publicKey,
    counter: 0,
    transports: response.response.getTransports?.() ?? [],
    userId: response.response.userHandle ?? '',
    createdAt: Date.now(),
  };
}

/**
 * Verify an authentication response from the authenticator.
 * In a full implementation, this would verify the assertion signature
 * against the stored public key and check the counter.
 */
export function verifyAuthenticationResponse(
  response: any,
  expectedChallenge: string,
  credential: WebAuthnCredential,
  config: WebAuthnConfig,
): boolean {
  if (!response || !response.id || !response.response) return false;

  const clientDataJSON = parseClientData(response.response.clientDataJSON);
  if (!clientDataJSON) return false;

  if (clientDataJSON.type !== 'webauthn.get') return false;
  if (clientDataJSON.origin !== config.origin) return false;

  const challenge = extractChallenge(clientDataJSON.challenge);
  if (challenge !== expectedChallenge) return false;

  if (response.id !== credential.id) return false;

  const authData = response.response.authenticatorData;
  const counter = parseCounter(authData);
  if (counter <= credential.counter) return false;

  return true;
}

/**
 * Generate conditional UI mediation options.
 * This enables autofill-based passkey prompts in the browser.
 */
export function getConditionalUIOptions(config: WebAuthnConfig): Record<string, unknown> {
  return {
    publicKey: {
      challenge: generateChallenge(),
      rpId: config.rpId,
      userVerification: config.userVerification ?? DEFAULT_USER_VERIFICATION,
      mediation: 'conditional',
    },
  };
}

/**
 * Check if the current browser supports WebAuthn.
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' &&
    'PublicKeyCredential' in window &&
    typeof window.PublicKeyCredential !== 'undefined';
}

/**
 * Check if the current browser supports conditional UI (autofill).
 */
export async function isConditionalUISupported(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    const anyPKC = window.PublicKeyCredential as any;
    return typeof anyPKC.isConditionalMediationAvailable === 'function' &&
      await anyPKC.isConditionalMediationAvailable();
  } catch {
    return false;
  }
}

function parseClientData(data: any): any | null {
  try {
    if (typeof data === 'string') return JSON.parse(data);
    if (data instanceof ArrayBuffer) return JSON.parse(new TextDecoder().decode(data));
    return data;
  } catch {
    return null;
  }
}

function extractChallenge(challenge: any): string {
  if (typeof challenge === 'string') return challenge;
  if (challenge instanceof ArrayBuffer) {
    return new TextDecoder().decode(challenge);
  }
  return String(challenge);
}

function parseCounter(authData: any): number {
  if (!authData) return 0;
  try {
    const buf = authData instanceof ArrayBuffer ? new Uint8Array(authData) : authData;
    if (buf.length < 37) return 0;
    return ((buf[33] << 24) | (buf[34] << 16) | (buf[35] << 8) | buf[36]) >>> 0;
  } catch {
    return 0;
  }
}
