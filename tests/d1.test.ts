/**
 * Regression test for the Cloudflare D1 request format.
 *
 * The deployed site once failed with "Database unavailable." because batches were
 * sent as a bare array, which Cloudflare rejects with:
 *   7400: Invalid input: Expected object, received array
 *
 * These assertions encode Cloudflare's documented contract: either
 * `{ sql, params }` or `{ batch: [ { sql, params } ] }`.
 *
 * Run with:  npm run test:d1
 */
import assert from "node:assert/strict";
import { buildRequestBody, d1Batch, d1Query } from "../src/lib/d1.ts";

let passed = 0;
const check = (label: string, fn: () => void | Promise<void>) =>
  Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  ok   ${label}`);
    })
    .catch((error: unknown) => {
      console.error(`  FAIL ${label}\n       ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
    });

/** Mirrors Cloudflare's validation: reject a bare array with code 7400. */
function assertValidCloudflareBody(body: unknown) {
  assert.ok(!Array.isArray(body), "body must not be a bare array (Cloudflare returns 7400)");
  assert.equal(typeof body, "object", "body must be an object");
  const b = body as { sql?: unknown; batch?: unknown };
  const isSingle = typeof b.sql === "string";
  const isBatch =
    Array.isArray(b.batch) &&
    (b.batch as unknown[]).every((q) => typeof (q as { sql?: unknown }).sql === "string");
  assert.ok(isSingle || isBatch, "body must contain either `sql` or `batch`");
}

console.log("== buildRequestBody shape ==");

await check("single statement -> { sql, params }", () => {
  const body = buildRequestBody([{ sql: "SELECT 1" }]);
  assertValidCloudflareBody(body);
  assert.equal((body as { sql: string }).sql, "SELECT 1");
  assert.deepEqual((body as { params: unknown[] }).params, []);
});

await check("single statement keeps params", () => {
  const body = buildRequestBody([{ sql: "SELECT ?", params: ["x"] }]);
  assert.deepEqual((body as { params: unknown[] }).params, ["x"]);
});

await check("multiple statements -> { batch: [...] }", () => {
  const body = buildRequestBody([{ sql: "CREATE TABLE a (id TEXT)" }, { sql: "CREATE TABLE b (id TEXT)" }]);
  assertValidCloudflareBody(body);
  const batch = (body as { batch: { sql: string }[] }).batch;
  assert.equal(batch.length, 2);
  assert.equal(batch[0].sql, "CREATE TABLE a (id TEXT)");
});

await check("many statements stay wrapped", () => {
  const body = buildRequestBody(Array.from({ length: 14 }, (_, i) => ({ sql: `SELECT ${i}` })));
  assertValidCloudflareBody(body);
  assert.equal((body as { batch: unknown[] }).batch.length, 14);
});

console.log("== live request bodies (mocked fetch) ==");

await check("d1Batch sends a valid body for a multi-statement call", async () => {
  const originalFetch = globalThis.fetch;
  let captured: unknown = null;
  process.env.CLOUDFLARE_ACCOUNT_ID = "acct";
  process.env.CLOUDFLARE_DATABASE_ID = "db";
  process.env.CLOUDFLARE_API_TOKEN = "token";

  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    captured = JSON.parse(String(init.body));
    assertValidCloudflareBody(captured);
    return new Response(
      JSON.stringify({
        success: true,
        errors: [],
        result: [
          { success: true, results: [], meta: {} },
          { success: true, results: [], meta: {} },
        ],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const out = await d1Batch([{ sql: "SELECT 1" }, { sql: "SELECT 2" }]);
    assert.equal(out.length, 2);
    assert.ok(Array.isArray((captured as { batch: unknown[] }).batch), "should be a batch body");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await check("d1Query sends a valid single-statement body", async () => {
  const originalFetch = globalThis.fetch;
  let captured: unknown = null;
  globalThis.fetch = (async (_url: string, init: RequestInit) => {
    captured = JSON.parse(String(init.body));
    assertValidCloudflareBody(captured);
    return new Response(
      JSON.stringify({ success: true, errors: [], result: [{ success: true, results: [{ n: 1 }], meta: {} }] }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }) as typeof fetch;

  try {
    const rows = await d1Query<{ n: number }>("SELECT 1");
    assert.deepEqual(rows, [{ n: 1 }]);
    assert.equal(typeof (captured as { sql: string }).sql, "string");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await check("Cloudflare error 7400 surfaces with detail", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        success: false,
        errors: [{ code: 7400, message: "Invalid input: Expected object, received array" }],
        result: null,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    )) as typeof fetch;

  try {
    await assert.rejects(() => d1Query("SELECT 1"), /7400: Invalid input: Expected object, received array/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

console.log(`\n${passed} checks passed`);
