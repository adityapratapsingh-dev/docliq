import { SCHEMA_STATEMENTS } from "@/lib/schema";
import { d1Batch, isD1Configured } from "@/lib/d1";

let tablesReady: Promise<void> | null = null;

/**
 * Create every table/index if missing.
 *
 * Idempotent and memoised per process, so it costs one round-trip on cold start
 * and nothing afterwards. Kept separate from `d1.ts` so the HTTP client there
 * stays dependency-free and easy to test.
 */
export function ensureTablesExist(): Promise<void> {
  if (!tablesReady) {
    tablesReady = (async () => {
      if (!isD1Configured()) return;
      await d1Batch(SCHEMA_STATEMENTS.map((sql) => ({ sql })));
    })().catch((error) => {
      // Allow a later request to retry rather than caching the failure forever.
      tablesReady = null;
      throw error;
    });
  }
  return tablesReady;
}
