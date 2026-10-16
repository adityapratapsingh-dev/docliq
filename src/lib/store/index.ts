import { isD1Configured } from "@/lib/d1";
import { D1Store } from "@/lib/store/d1";
import { getMemoryStore } from "@/lib/store/memory";
import type { Store } from "@/lib/store/types";

export type { Store } from "@/lib/store/types";
export { toPublicUser } from "@/lib/store/types";

let cached: { store: Store; kind: "d1" | "memory" } | null = null;

/**
 * Pick the backing store once per process.
 *
 * When the Cloudflare D1 environment variables are present we use D1. Otherwise
 * we fall back to an in-memory store so the app never 500s just because the
 * database has not been configured on the host yet.
 */
export function getStore(): Store {
  const kind = isD1Configured() ? "d1" : "memory";
  if (!cached || cached.kind !== kind) {
    cached = { store: kind === "d1" ? new D1Store() : getMemoryStore(), kind };
  }
  return cached.store;
}

/** True when running on the in-memory fallback (surfaced as a setup hint in Settings). */
export function usingFallbackStore(): boolean {
  return !isD1Configured();
}
