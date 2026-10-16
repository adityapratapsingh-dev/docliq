import { ApiError } from "@/types/cliq";
import { newId } from "@/lib/auth";
import { fail, ok, optionalString, readJson, requireString } from "@/lib/api";
import { requireSessionUser } from "@/lib/server-auth";
import { getStore } from "@/lib/store";

/**
 * GET /api/messages
 *   ?with=<userId>  -> full thread with that user (also marks it read)
 *   (no params)     -> conversation list for the signed-in user
 *
 * Polled every few seconds by the chat window for near-real-time delivery.
 */
export async function GET(request: Request) {
  try {
    const me = await requireSessionUser();
    const url = new URL(request.url);
    const withUser = url.searchParams.get("with");
    const store = getStore();

    if (!withUser) {
      const conversations = await store.listConversations(me.id);
      return ok({ conversations });
    }

    const partnerId = requireString(withUser, "Conversation partner", { max: 200 });
    if (partnerId === me.id) throw new ApiError(400, "You cannot message yourself.");

    const partner = await store.getUserById(partnerId);
    if (!partner) throw new ApiError(404, "That user does not exist.");

    const messages = await store.listMessages(me.id, partnerId);
    if (url.searchParams.get("markRead") !== "false") {
      await store.markConversationRead(me.id, partnerId);
    }
    return ok({ messages });
  } catch (error) {
    return fail(error);
  }
}

interface Body {
  receiverId?: string;
  content?: string;
  mediaUrl?: string | null;
  replyToId?: string | null;
}

/** POST /api/messages — send a message (text and/or an image URL). */
export async function POST(request: Request) {
  try {
    const me = await requireSessionUser();
    const body = await readJson<Body>(request);
    const receiverId = requireString(body.receiverId, "Recipient", { max: 200 });
    if (receiverId === me.id) throw new ApiError(400, "You cannot message yourself.");

    const content = optionalString(body.content, "Message", 2000) ?? "";
    const mediaUrl = optionalString(body.mediaUrl, "Image URL", 2000);
    if (!content && !mediaUrl) throw new ApiError(400, "Write something or attach an image.");

    const store = getStore();
    const receiver = await store.getUserById(receiverId);
    if (!receiver) throw new ApiError(404, "That user does not exist.");

    const replyToId = optionalString(body.replyToId, "Reply target", 200);
    if (replyToId) {
      const thread = await store.listMessages(me.id, receiverId);
      if (!thread.some((m) => m.id === replyToId)) {
        throw new ApiError(400, "You can only reply to a message in this conversation.");
      }
    }

    const message = await store.createMessage({
      id: newId("m"),
      senderId: me.id,
      receiverId,
      content,
      mediaUrl,
      replyToId,
      createdAt: new Date().toISOString(),
    });

    return ok({ message }, { status: 201 });
  } catch (error) {
    return fail(error);
  }
}

interface PatchBody {
  messageId?: string;
  emoji?: string;
}

/** PATCH /api/messages — toggle an emoji reaction on a message. */
export async function PATCH(request: Request) {
  try {
    const me = await requireSessionUser();
    const body = await readJson<PatchBody>(request);
    const messageId = requireString(body.messageId, "Message id", { max: 200 });
    const emoji = requireString(body.emoji, "Emoji", { max: 12 });
    const store = getStore();
    const message = await store.setMessageReaction(messageId, me.id, emoji);
    return ok({ message });
  } catch (error) {
    return fail(error);
  }
}

/** DELETE /api/messages?id=... — unsend one of your own messages. */
export async function DELETE(request: Request) {
  try {
    const me = await requireSessionUser();
    const url = new URL(request.url);
    const id = requireString(url.searchParams.get("id"), "Message id", { max: 200 });
    const store = getStore();
    const deleted = await store.deleteMessage(id, me.id);
    if (!deleted) throw new ApiError(404, "Message not found.");
    return ok({ ok: true });
  } catch (error) {
    return fail(error);
  }
}
