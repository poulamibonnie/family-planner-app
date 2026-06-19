import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';

const KEY_LEN = 64;
const PARAMS  = { N: 16384, r: 8, p: 1 };

function scryptAsync(password: string, salt: string, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, keylen, PARAMS, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

// Stored format: scrypt$<saltHex>$<hashHex>
export async function hashPassword(plain: string): Promise<string> {
  const salt    = randomBytes(16).toString('hex');
  const derived = await scryptAsync(plain, salt, KEY_LEN);
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

// Returns true if plain matches stored hash (or legacy plaintext).
// Caller must re-hash on success when stored value is plaintext (no prefix).
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (!stored.startsWith('scrypt$')) {
    // Legacy plaintext path — timing-safe comparison is moot here because we
    // are comparing against a known-plaintext DB value; fall through to upgrade.
    return stored === plain;
  }
  const parts      = stored.split('$');
  const salt       = parts[1];
  const storedHash = Buffer.from(parts[2], 'hex');
  const derived    = await scryptAsync(plain, salt, KEY_LEN);
  if (derived.length !== storedHash.length) return false;
  return timingSafeEqual(derived, storedHash);
}
