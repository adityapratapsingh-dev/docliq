import { ApiError } from "@/types/cliq";
import { newId } from "@/lib/auth";
import { fail, ok, readJson, requireString } from "@/lib/api";
import { requireSessionUser } from "@/lib/server-auth";
import { getStore } from "@/lib/store";

/** GET /api/comments?postId=... — nested comment tree for a post. */
export async function GET(request: Request) {
  try {
    await requireSessionUser();
    const url = new URL(request.url);
    const postId = requireString(url.searchParams.get("postId"), "Post id", { max: 200 });
    const store = getStore();
    const comments = await store.listComments(postId);
    return ok({ comments });
  } catch (error) {
    return fail(error);
  }
}

interface Body {
  postId?: string;
  content?: string;
  parentCommentId?: string | null;
}

/** POST /api/comments — add a comment, or a reply when parentCommentId is set. */
export async function POST(request: Request) {
  try {
    const me = await requireSessionUser();
    const body = await readJson<Body>(request);
    const postId = requireString(body.postId, "Post id", { max: 200 });
    const content = requireString(body.content, "Comment", { max: 1000 });
    const store = getStore();

    const post = await store.getPost(postId, me.id);
    if (!post) throw new ApiError(404, "Post not found.");

    const comment = await store.createComment({
      id: newId("c"),
      postId,
      userId: me.id,
      parentCommentId: body.parentCommentId ? String(body.parentCommentId) : null,
      content,
      createdAt: new Date().toISOString(),
    });

    return ok({ comment }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}
