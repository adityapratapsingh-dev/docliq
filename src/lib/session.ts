import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Stateless, signed session tokens (HMAC-SHA256 via Web Crypto).
 *
 * Chosen over a sessions table so auth works on Vercel's serverless runtime with
 * no extra schema and no sticky instances. The signing key comes from
 * `CLIQ_SESSION_SECRET`; when unset we derive a stable per-deployment key so the
 * app still works out of the box (with a warning surfaced in Settings).
 */

const encoder = new TextEncoder();

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function sessionSecretConfigured(): boolean {
  return Boolean(process.env.CLIQ_SESSION_SECRET?.trim());
}

function secret(): string {
  const explicit = process.env.CLIQ_SESSION_SECRET?.trim();
  if (explicit) return explicit;
  // Deterministic fallback so a fresh deploy keeps sessions working.
  return `cliq-fallback-secret:${process.env.CLOUDFLARE_DATABASE_ID ?? "local"}`;
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export interface SessionPayload {
  userId: string;
  issuedAt: number;
}

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

export async function createSessionToken(userId: string): Promise<string> {
  const payload: SessionPayload = { userId, issuedAt: Date.now() };
  const body = base64UrlEncode(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await key(), encoder.encode(body));
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  try {
    const valid = await crypto.subtle.verify(
      "HMAC",
      await key(),
      base64UrlDecode(signature) as unknown as BufferSource,
      encoder.encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as SessionPayload;
    if (!payload?.userId) return null;
    const ageMs = Date.now() - payload.issuedAt;
    if (ageMs > MAX_AGE_SECONDS * 1000) return null;
    return payload;
  } catch {
    return null;
  }
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
export { SESSION_COOKIE };
