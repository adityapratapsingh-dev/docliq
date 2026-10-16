import { cookies } from "next/headers";
import { ApiError, type SessionUser } from "@/types/cliq";
import { getStore } from "@/lib/store";
import { toPublicUser } from "@/lib/store/types";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/** Read the signed-in user from the session cookie, or null when anonymous. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const store = getStore();
  const user = await store.getUserById(payload.userId);
  if (!user) return null;

  return { ...toPublicUser(user), email: user.email, settings: user.settings };
}

/** Like getSessionUser but throws a 401 ApiError for protected routes. */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "You need to log in to do that.");
  return user;
}
