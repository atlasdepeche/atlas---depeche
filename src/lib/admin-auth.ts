/**
 * Minimal admin auth — httpOnly session cookie with SHA-256 password hash.
 * Uses Web Crypto API (available in both Node.js and Edge runtimes).
 * No users table — single admin from env vars (ADMIN_USER / ADMIN_PASSWORD_HASH).
 */
const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const COOKIE_NAME = SESSION_COOKIE;
export const COOKIE_MAX_AGE = SESSION_MAX_AGE;

/**
 * SHA-256 hash of a password, hex-encoded. Used to verify against
 * ADMIN_PASSWORD_HASH env var. Works in both Node.js and Edge runtimes.
 */
export async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify username + password against env vars. Returns true if valid.
 */
export async function verifyCredentials(
  username: string,
  password: string,
): Promise<boolean> {
  const adminUser = process.env.ADMIN_USER;
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;
  if (!adminUser || !adminPasswordHash) return false;
  if (username !== adminUser) return false;
  const providedHash = await sha256hex(password);
  return providedHash === adminPasswordHash;
}

/**
 * Generate a SHA-256 hash for storing in ADMIN_PASSWORD_HASH.
 * Run once: npx tsx -e "import { sha256hex } from './src/lib/admin-auth'; sha256hex('your-password').then(console.log)"
 */
