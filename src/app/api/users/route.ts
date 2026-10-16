import { ApiError, DEFAULT_SETTINGS, type Settings } from "@/types/cliq";
import { fail, ok, optionalString, readJson } from "@/lib/api";
import { requireSessionUser } from "@/lib/server-auth";
import { getStore } from "@/lib/store";
import { toPublicUser } from "@/lib/store/types";

/** GET /api/users — everyone else, for Find Your Cliq. Supports ?q= and ?interest=. */
export async function GET(request: Request) {
  try {
    const me = await requireSessionUser();
    const url = new URL(request.url);
    const query = (url.searchParams.get("q") ?? "").trim().toLowerCase().replace(/^@/, "");
    const interest = (url.searchParams.get("interest") ?? "").trim();

    const store = getStore();
    const users = await store.listUsers(me.id);

    const filtered = users.filter((user) => {
      if (interest && interest !== "All Vibes" && !user.interests.includes(interest)) return false;
      if (!query) return true;
      return (
        user.username.toLowerCase().includes(query) ||
        user.displayName.toLowerCase().includes(query) ||
        user.interests.some((i) => i.toLowerCase().includes(query))
      );
    });

    return ok({ users: filtered.map(toPublicUser) });
  } catch (error) {
    return fail(error);
  }
}

interface PatchBody {
  displayName?: string;
  bio?: string;
  age?: number | string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  interests?: string[];
  settings?: Partial<Settings>;
}

/** PATCH /api/users — update the signed-in user's profile and/or settings. */
export async function PATCH(request: Request) {
  try {
    const me = await requireSessionUser();
    const body = await readJson<PatchBody>(request);
    const store = getStore();

    let age: number | null | undefined;
    if (body.age !== undefined) {
      if (body.age === null || `${body.age}`.trim() === "") {
        age = null;
      } else {
        const parsed = Number.parseInt(`${body.age}`, 10);
        if (!Number.isFinite(parsed) || parsed < 13 || parsed > 120) {
          throw new ApiError(400, "Age must be a number between 13 and 120.");
        }
        age = parsed;
      }
    }

    const interests = Array.isArray(body.interests)
      ? body.interests.filter((i): i is string => typeof i === "string").slice(0, 12)
      : undefined;

    const settings: Settings | undefined = body.settings
      ? { ...DEFAULT_SETTINGS, ...me.settings, ...body.settings }
      : undefined;

    // Only include keys the client actually sent — spreading `undefined` would
    // otherwise wipe existing values in the store.
    const patch: Parameters<typeof store.updateUser>[1] = {};
    if (body.displayName !== undefined) patch.displayName = optionalString(body.displayName, "Display name", 60) ?? me.displayName;
    if (body.bio !== undefined) patch.bio = optionalString(body.bio, "Bio", 300) ?? "";
    if (body.age !== undefined) patch.age = age ?? null;
    if (body.avatarUrl !== undefined) patch.avatarUrl = optionalString(body.avatarUrl, "Avatar URL", 2000);
    if (body.bannerUrl !== undefined) patch.bannerUrl = optionalString(body.bannerUrl, "Banner URL", 2000);
    if (interests !== undefined) patch.interests = interests;
    if (settings !== undefined) patch.settings = settings;

    const updated = await store.updateUser(me.id, patch);

    return ok({ user: { ...toPublicUser(updated), email: updated.email, settings: updated.settings } });
  } catch (error) {
    return fail(error);
  }
}
