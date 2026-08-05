import { encrypt, decrypt } from './crypto';

// The Google OAuth `state` param is an AES-256-GCM-encrypted (authenticated,
// tamper-proof) record of who started the flow and from which platform, plus a
// timestamp. The callback decodes it to identify the user WITHOUT relying on the
// session cookie — essential for the native iOS shell, where consent runs in the
// system browser (separate cookie store). Reuses lib/crypto (TOKEN_ENC_KEY).
// See docs/DECISIONS.md (native OAuth ADR).

const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes to complete the consent flow

export interface OAuthState {
  uid: string;
  native: boolean;
}

export function encodeOAuthState(uid: string, native: boolean): string {
  return encrypt(JSON.stringify({ uid, native, ts: Date.now() }));
}

export function decodeOAuthState(state: string): OAuthState | null {
  try {
    const parsed = JSON.parse(decrypt(state)) as {
      uid?: unknown;
      native?: unknown;
      ts?: unknown;
    };
    if (typeof parsed.uid !== 'string' || typeof parsed.ts !== 'number') return null;
    if (Date.now() - parsed.ts > MAX_AGE_MS) return null;
    return { uid: parsed.uid, native: parsed.native === true };
  } catch {
    return null;
  }
}
