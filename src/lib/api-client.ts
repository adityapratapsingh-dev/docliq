import type {
  Comment,
  ConversationSummary,
  FriendGraph,
  Message,
  Post,
  PostType,
  PublicUser,
  ReactionType,
  SessionUser,
  Settings,
} from "@/types/cliq";

export class ApiClientError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.status = status;
    this.detail = detail;
    this.name = "ApiClientError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const body = payload as { error?: string; detail?: string } | null;
    const message = body?.error ?? `Request failed (${response.status}).`;
    // Keep the underlying cause (e.g. a D1 error) alongside the user-facing text
    // so failures are diagnosable instead of just "Database unavailable."
    const detail = body?.detail && body.detail !== message ? body.detail : undefined;
    throw new ApiClientError(response.status, message, detail);
  }
  return (payload ?? {}) as T;
}

function post<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, { method: "POST", body: JSON.stringify(body) });
}

/** The API does not know who "me" is for a message; derive `fromMe` from the session. */
let currentUserId: string | undefined;

function decorateMessages(messages: Message[], myId: string | undefined = currentUserId): Message[] {
  if (!myId) return messages.map((m) => ({ ...m, fromMe: false }));
  return messages.map((m) => ({ ...m, fromMe: m.senderId === myId }));
}

function decorateConversations(list: ConversationSummary[]): ConversationSummary[] {
  return list.map((c) => ({
    ...c,
    lastMessage: c.lastMessage ? decorateMessages([c.lastMessage])[0] : null,
  }));
}

export const api = {
  // ---------------------------------------------------------------- auth
  async me(): Promise<SessionUser | null> {
    const { user } = await request<{ user: SessionUser | null }>("/api/auth");
    currentUserId = user?.id;
    return user;
  },

  async signUp(input: {
    username: string;
    displayName: string;
    password: string;
    email?: string;
    age?: number | null;
    bio?: string;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    interests: string[];
  }): Promise<{ user: SessionUser }> {
    const result = await post<{ user: SessionUser }>("/api/auth", { mode: "signup", ...input });
    currentUserId = result.user.id;
    return result;
  },

  async logIn(username: string, password: string): Promise<{ user: SessionUser }> {
    const result = await post<{ user: SessionUser }>("/api/auth", { mode: "login", username, password });
    currentUserId = result.user.id;
    return result;
  },

  async logOut(): Promise<{ ok: boolean }> {
    const result = await request<{ ok: boolean }>("/api/auth", { method: "DELETE" });
    currentUserId = undefined;
    return result;
  },

  // --------------------------------------------------------------- users
  async listUsers(query?: string, interest?: string): Promise<PublicUser[]> {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (interest && interest !== "All Vibes") params.set("interest", interest);
    const suffix = params.toString();
    const { users } = await request<{ users: PublicUser[] }>(`/api/users${suffix ? `?${suffix}` : ""}`);
    return users;
  },

  updateProfile(patch: {
    displayName?: string;
    bio?: string;
    age?: number | null;
    avatarUrl?: string | null;
    bannerUrl?: string | null;
    interests?: string[];
    settings?: Partial<Settings>;
  }): Promise<{ user: SessionUser }> {
    return request<{ user: SessionUser }>("/api/users", {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  // --------------------------------------------------------------- posts
  async listPosts(type: PostType): Promise<Post[]> {
    const { posts } = await request<{ posts: Post[] }>(`/api/posts?type=${type}`);
    return posts;
  },

  createPost(input: {
    type: PostType;
    content: string;
    mediaUrl?: string | null;
    flair?: string | null;
    pollOptions?: string[];
  }): Promise<{ post: Post }> {
    return post<{ post: Post }>("/api/posts", input);
  },

  deletePost(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/posts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  react(postId: string, reaction: ReactionType): Promise<{ post: Post }> {
    return post<{ post: Post }>("/api/posts/react", { postId, reaction });
  },

  votePoll(postId: string, optionId: string): Promise<{ post: Post }> {
    return post<{ post: Post }>("/api/posts/react", { postId, optionId });
  },

  // ------------------------------------------------------------ comments
  async listComments(postId: string): Promise<Comment[]> {
    const { comments } = await request<{ comments: Comment[] }>(
      `/api/comments?postId=${encodeURIComponent(postId)}`,
    );
    return comments;
  },

  addComment(postId: string, content: string, parentCommentId?: string | null): Promise<{ comment: Comment }> {
    return post<{ comment: Comment }>("/api/comments", { postId, content, parentCommentId: parentCommentId ?? null });
  },

  // ----------------------------------------------------------- friends
  getFriends(): Promise<FriendGraph> {
    return request<FriendGraph>("/api/friends");
  },

  requestFriend(userId: string): Promise<FriendGraph> {
    return post<FriendGraph>("/api/friends", { action: "request", userId });
  },

  respondFriend(friendshipId: string, accept: boolean): Promise<FriendGraph> {
    return post<FriendGraph>("/api/friends", {
      action: accept ? "accept" : "decline",
      friendshipId,
    });
  },

  // ---------------------------------------------------------- messages
  async listConversations(): Promise<ConversationSummary[]> {
    const { conversations } = await request<{ conversations: ConversationSummary[] }>("/api/messages");
    return decorateConversations(conversations);
  },

  async listMessages(partnerId: string, markRead = true): Promise<Message[]> {
    const params = new URLSearchParams({ with: partnerId });
    if (!markRead) params.set("markRead", "false");
    const { messages } = await request<{ messages: Message[] }>(`/api/messages?${params.toString()}`);
    return decorateMessages(messages);
  },

  async sendMessage(input: {
    receiverId: string;
    content?: string;
    mediaUrl?: string | null;
    replyToId?: string | null;
  }): Promise<{ message: Message }> {
    const { message } = await post<{ message: Message }>("/api/messages", input);
    return { message: decorateMessages([message])[0] };
  },

  async reactToMessage(messageId: string, emoji: string): Promise<{ message: Message }> {
    const { message } = await request<{ message: Message }>("/api/messages", {
      method: "PATCH",
      body: JSON.stringify({ messageId, emoji }),
    });
    return { message: decorateMessages([message])[0] };
  },

  deleteMessage(id: string): Promise<{ ok: boolean }> {
    return request<{ ok: boolean }>(`/api/messages?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
