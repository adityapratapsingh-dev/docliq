import { NextResponse } from "next/server";
import { ApiError, DEFAULT_SETTINGS, type Settings } from "@/types/cliq";
import { hashPassword, newId, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE, SESSION_MAX_AGE, createSessionToken } from "@/lib/session";
import { getStore } from "@/lib/store";
import { toPublicUser } from "@/lib/store/types";
import { fail, ok, optionalString, readJson, requireString } from "@/lib/api";
import { getSessionUser } from "@/lib/server-auth";

interface AuthBody {
  mode?: "signup" | "login";
  username?: string;
  displayName?: string;
  password?: string;
  email?: string;
  age?: number | string;
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  interests?: string[];
}

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function GET() {
  try {
    const user = await getSessionUser();
    return ok({ user });
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await readJson<AuthBody>(request);
    const store = getStore();

    if (body.mode === "login") {
      const username = requireString(body.username, "Username", { max: 40 }).replace(/^@/, "").toLowerCase();
      const password = requireString(body.password, "Password", { max: 200 });
      const user = await store.getUserByUsername(username);
      if (!user || !(await verifyPassword(password, user.passwordHash))) {
        throw new ApiError(401, "Incorrect @username or password.");
      }
      const token = await createSessionToken(user.id);
      const response = NextResponse.json({
        user: { ...toPublicUser(user), email: user.email, settings: user.settings },
      });
      response.cookies.set(SESSION_COOKIE, token, cookieOptions());
      return response;
    }

    // ------------------------------------------------ sign up
    const rawUsername = requireString(body.username, "Username", { max: 40 }).replace(/^@/, "").toLowerCase();
    if (!USERNAME_RE.test(rawUsername)) {
      throw new ApiError(400, "Usernames must be 3-20 characters: letters, numbers or underscores.");
    }
    const displayName = requireString(body.displayName, "Display name", { max: 60 });
    const password = requireString(body.password, "Password", { max: 200, min: 6 });
    const email = optionalString(body.email, "Email", 160) ?? "";

    let age: number | null = null;
    if (body.age !== undefined && body.age !== null && `${body.age}`.trim() !== "") {
      const parsed = Number.parseInt(`${body.age}`, 10);
      if (!Number.isFinite(parsed) || parsed < 13 || parsed > 120) {
        throw new ApiError(400, "Age must be a number between 13 and 120.");
      }
      age = parsed;
    }

    const interests = Array.isArray(body.interests)
      ? body.interests.filter((i): i is string => typeof i === "string").slice(0, 12)
      : [];

    const settings: Settings = { ...DEFAULT_SETTINGS };
    const user = await store.createUser({
      id: newId("u"),
      username: rawUsername,
      displayName,
      email,
      passwordHash: await hashPassword(password),
      age,
      bio: optionalString(body.bio, "Bio", 300) ?? "",
      avatarUrl: optionalString(body.avatarUrl, "Avatar URL", 2000),
      bannerUrl: optionalString(body.bannerUrl, "Banner URL", 2000),
      interests,
      settings,
      createdAt: new Date().toISOString(),
    });

    const token = await createSessionToken(user.id);
    const response = NextResponse.json(
      { user: { ...toPublicUser(user), email: user.email, settings: user.settings } },
      { status: 201 },
    );
    response.cookies.set(SESSION_COOKIE, token, cookieOptions());
    return response;
  } catch (error) {
    return fail(error);
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
  return response;
}
