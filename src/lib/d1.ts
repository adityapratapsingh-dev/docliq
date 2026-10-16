/**
 * Minimal Cloudflare D1 client over the HTTP REST API.
 *
 * Works on Vercel's Node runtime (no bindings needed) as long as these env vars
 * are set:
 *   CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_DATABASE_ID, CLOUDFLARE_API_TOKEN
 *
 * When they are missing the helper reports `configured: false` instead of
 * throwing, so the app can transparently fall back to the in-memory store.
 *
 * This module deliberately has no imports so it stays trivially testable; the
 * schema bootstrap lives in `d1-schema.ts`.
 */

export interface D1Config {
  accountId: string;
  databaseId: string;
  apiToken: string;
}

export function getD1Config(): D1Config | null {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const databaseId = process.env.CLOUDFLARE_DATABASE_ID?.trim();
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId || !databaseId || !apiToken) return null;
  return { accountId, databaseId, apiToken };
}

export function isD1Configured(): boolean {
  return getD1Config() !== null;
}

function endpoint(config: D1Config): string {
  return `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`;
}

interface CloudflareResponse<T> {
  success: boolean;
  errors?: { code: number; message: string }[];
  result?: { results?: T[]; success?: boolean; meta?: Record<string, unknown> }[] | null;
}

/**
 * Build the request body for the D1 /query endpoint.
 *
 * Cloudflare accepts either a single `{ sql, params }` object or a batch wrapped
 * as `{ batch: [ { sql, params }, ... ] }`. Sending a bare array fails with
 * error 7400 ("Invalid input: Expected object, received array"), so keep this
 * in one place and cover it with a test.
 */
export function buildRequestBody(
  statements: { sql: string; params?: unknown[] }[],
): { sql: string; params: unknown[] } | { batch: { sql: string; params: unknown[] }[] } {
  if (statements.length === 1) {
    return { sql: statements[0].sql, params: statements[0].params ?? [] };
  }
  return { batch: statements.map((s) => ({ sql: s.sql, params: s.params ?? [] })) };
}

/** Run one SQL statement and return its rows. */
export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const rows = await d1Batch<T>([{ sql, params }]);
  return rows[0] ?? [];
}

/**
 * Run one or more SQL statements. Accepts either a single statement or an array
 * (Cloudflare executes arrays in an implicit transaction).
 */
export async function d1Batch<T = Record<string, unknown>>(
  statements: { sql: string; params?: unknown[] }[],
): Promise<T[][]> {
  const config = getD1Config();
  if (!config) {
    throw new Error("D1 is not configured (missing CLOUDFLARE_* environment variables).");
  }

  const response = await fetch(endpoint(config), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildRequestBody(statements)),
    cache: "no-store",
  });

  const text = await response.text();
  let parsed: CloudflareResponse<T> | null = null;
  try {
    parsed = text ? (JSON.parse(text) as CloudflareResponse<T>) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok || !parsed?.success) {
    const detail =
      parsed?.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") ||
      text.slice(0, 300) ||
      `HTTP ${response.status}`;
    throw new Error(`D1 query failed — ${detail}`);
  }

  const results = parsed.result ?? [];
  // A single-statement request returns one result object; a batch returns many.
  const list = Array.isArray(results) ? results : [results];
  return list.map((r) => (Array.isArray(r?.results) ? (r.results as T[]) : []));
}
