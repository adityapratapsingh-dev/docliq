import { ApiError, type ReactionType } from "@/types/cliq";
import { fail, ok, readJson, requireString } from "@/lib/api";
import { requireSessionUser } from "@/lib/server-auth";
import { getStore } from "@/lib/store";

const REACTIONS: ReactionType[] = ["like", "dislike", "upgrade", "downgrade"];

interface Body {
  postId?: string;
  reaction?: string;
  optionId?: string;
}

/**
 * POST /api/posts/react — toggle a reaction.
 *
 * - photos/videos: like | dislike
 * - chat posts:    upgrade | downgrade
 * - pass `optionId` instead to cast a poll vote.
 */
export async function POST(request: Request) {
  try {
    const me = await requireSessionUser();
    const body = await readJson<Body>(request);
    const postId = requireString(body.postId, "Post id", { max: 200 });
    const store = getStore();

    if (body.optionId) {
      const optionId = requireString(body.optionId, "Poll option", { max: 200 });
      const post = await store.votePoll(postId, me.id, optionId);
      return ok({ post });
    }

    const reaction = requireString(body.reaction, "Reaction", { max: 20 }) as ReactionType;
    if (!REACTIONS.includes(reaction)) {
      throw new ApiError(400, "reaction must be one of: like, dislike, upgrade, downgrade.");
    }

    const existing = await store.getPost(postId, me.id);
    if (!existing) throw new ApiError(404, "Post not found.");

    if ((existing.type === "chat") !== (reaction === "upgrade" || reaction === "downgrade")) {
      throw new ApiError(
        400,
        existing.type === "chat"
          ? "Chat posts use upgrade/downgrade."
          : "Photos and videos use like/dislike.",
      );
    }

    const post = await store.setPostReaction(postId, me.id, reaction);
    return ok({ post });
  } catch (error) {
    return fail(error);
  }
}
