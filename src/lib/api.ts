import { NextResponse } from "next/server";
import { ApiError } from "@/types/cliq";

/** JSON success response. */
export function ok<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

/** JSON error response, mapping ApiError to its status. */
export function fail(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  const message = error instanceof Error ? error.message : "Something went wrong.";
  // Surface D1 configuration problems as a 503 so the client can show the setup hint.
  const isConfig = /D1 is not configured|D1 query failed/i.test(message);
  return NextResponse.json(
    { error: isConfig ? "Database unavailable." : message, detail: message },
    { status: isConfig ? 503 : 500 },
  );
}

/** Parse and validate a JSON body, throwing a 400 on malformed input. */
export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new ApiError(400, "Invalid JSON body.");
  }
}

export function requireString(value: unknown, field: string, { max = 5000, min = 1 } = {}): string {
  if (typeof value !== "string") throw new ApiError(400, `${field} is required.`);
  const trimmed = value.trim();
  if (trimmed.length < min) throw new ApiError(400, `${field} is required.`);
  if (trimmed.length > max) throw new ApiError(400, `${field} must be under ${max} characters.`);
  return trimmed;
}

export function optionalString(value: unknown, field: string, max = 2000): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new ApiError(400, `${field} must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ApiError(400, `${field} must be under ${max} characters.`);
  return trimmed || null;
}
