import { ApiError } from "@/types/cliq";
import type {
  Comment,
  ConversationSummary,
  FriendGraph,
  Friendship,
  Message,
  MessageReaction,
  Post,
  Poll,
  PostType,
  PublicUser,
  ReactionType,
} from "@/types/cliq";
import {
  toPublicUser,
  type CreateCommentInput,
  type CreateMessageInput,
  type CreatePostInput,
  type CreateUserInput,
  type Store,
  type StoredUser,
  type UpdateUserPatch,
} from "@/lib/store/types";

interface StoredPost {
  id: string;
  userId: string;
  type: PostType;
  content: string;
  mediaUrl: string | null;
  flair: string | null;
  flairColor: string | null;
  poll: Poll | null;
  likesCount: number;
  dislikesCount: number;
  upgradesCount: number;
  downgradesCount: number;
  createdAt: string;
}

interface StoredReaction {
  postId: string;
  userId: string;
  type: ReactionType;
}

interface StoredComment {
  id: string;
  postId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
}

interface StoredMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  mediaUrl: string | null;
  replyToId: string | null;
  reactions: { userId: string; emoji: string }[];
  isRead: boolean;
  createdAt: string;
}

interface MemoryState {
  users: Map<string, StoredUser>;
  posts: Map<string, StoredPost>;
  reactions: StoredReaction[];
  comments: StoredComment[];
  friendships: Friendship[];
  messages: StoredMessage[];
}

/**
 * Process-local store used when Cloudflare D1 is not configured. Keeps the site
 * online with zero setup. Data lives for the lifetime of the serverless
 * instance, so it is a graceful degradation rather than durable storage.
 */
export class MemoryStore implements Store {
  readonly kind = "memory" as const;

  constructor(private state: MemoryState) {}

  // ---------------------------------------------------------------- users
  async createUser(input: CreateUserInput): Promise<StoredUser> {
    const username = input.username.toLowerCase();
    for (const user of this.state.users.values()) {
      if (user.username.toLowerCase() === username) {
        throw new ApiError(409, "That @username is already taken.");
      }
    }
    const user: StoredUser = { ...input, username };
    this.state.users.set(user.id, user);
    return user;
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    return this.state.users.get(id) ?? null;
  }

  async getUserByUsername(username: string): Promise<StoredUser | null> {
    const wanted = username.toLowerCase();
    for (const user of this.state.users.values()) {
      if (user.username.toLowerCase() === wanted) return user;
    }
    return null;
  }

  async listUsers(excludeId: string): Promise<StoredUser[]> {
    return [...this.state.users.values()]
      .filter((u) => u.id !== excludeId)
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async updateUser(id: string, patch: UpdateUserPatch): Promise<StoredUser> {
    const user = this.state.users.get(id);
    if (!user) throw new ApiError(404, "User not found.");
    // Ignore explicitly-undefined keys so a partial patch never clears a field.
    const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const next: StoredUser = { ...user, ...defined };
    this.state.users.set(id, next);
    return next;
  }

  // ---------------------------------------------------------------- posts
  private decoratePost(post: StoredPost, viewerId: string): Post {
    const author = this.state.users.get(post.userId);
    const reaction = this.state.reactions.find((r) => r.postId === post.id && r.userId === viewerId);
    return {
      id: post.id,
      userId: post.userId,
      author: author ? toPublicUser(author) : null,
      type: post.type,
      content: post.content,
      mediaUrl: post.mediaUrl,
      flair: post.flair,
      flairColor: post.flairColor,
      poll: post.poll,
      likesCount: post.likesCount,
      dislikesCount: post.dislikesCount,
      upgradesCount: post.upgradesCount,
      downgradesCount: post.downgradesCount,
      commentCount: this.state.comments.filter((c) => c.postId === post.id).length,
      myReaction: reaction?.type ?? null,
      createdAt: post.createdAt,
    };
  }

  async listPosts(type: PostType, viewerId: string): Promise<Post[]> {
    return [...this.state.posts.values()]
      .filter((p) => p.type === type)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((p) => this.decoratePost(p, viewerId));
  }

  async getPost(id: string, viewerId: string): Promise<Post | null> {
    const post = this.state.posts.get(id);
    return post ? this.decoratePost(post, viewerId) : null;
  }

  async createPost(input: CreatePostInput): Promise<Post> {
    const poll: Poll | null = input.pollOptions?.length
      ? { options: input.pollOptions.map((o) => ({ ...o, votes: 0 })), votedOptionId: null }
      : null;
    const post: StoredPost = {
      id: input.id,
      userId: input.userId,
      type: input.type,
      content: input.content,
      mediaUrl: input.mediaUrl,
      flair: input.flair,
      flairColor: input.flairColor,
      poll,
      likesCount: 0,
      dislikesCount: 0,
      upgradesCount: 0,
      downgradesCount: 0,
      createdAt: input.createdAt,
    };
    this.state.posts.set(post.id, post);
    return this.decoratePost(post, input.userId);
  }

  async deletePost(id: string, userId: string): Promise<boolean> {
    const post = this.state.posts.get(id);
    if (!post) return false;
    if (post.userId !== userId) throw new ApiError(403, "You can only delete your own posts.");
    this.state.posts.delete(id);
    this.state.reactions = this.state.reactions.filter((r) => r.postId !== id);
    this.state.comments = this.state.comments.filter((c) => c.postId !== id);
    return true;
  }

  async setPostReaction(postId: string, userId: string, type: ReactionType): Promise<Post> {
    const post = this.state.posts.get(postId);
    if (!post) throw new ApiError(404, "Post not found.");

    const index = this.state.reactions.findIndex((r) => r.postId === postId && r.userId === userId);
    const existing = index >= 0 ? this.state.reactions[index] : null;

    const apply = (t: ReactionType, delta: number) => {
      if (t === "like") post.likesCount += delta;
      else if (t === "dislike") post.dislikesCount += delta;
      else if (t === "upgrade") post.upgradesCount += delta;
      else post.downgradesCount += delta;
    };

    if (existing) apply(existing.type, -1);

    if (existing && existing.type === type) {
      this.state.reactions.splice(index, 1);
    } else {
      if (existing) this.state.reactions.splice(index, 1);
      this.state.reactions.push({ postId, userId, type });
      apply(type, 1);
    }

    post.likesCount = Math.max(0, post.likesCount);
    post.dislikesCount = Math.max(0, post.dislikesCount);
    post.upgradesCount = Math.max(0, post.upgradesCount);
    post.downgradesCount = Math.max(0, post.downgradesCount);
    return this.decoratePost(post, userId);
  }

  async votePoll(postId: string, userId: string, optionId: string): Promise<Post> {
    const post = this.state.posts.get(postId);
    if (!post || !post.poll) throw new ApiError(404, "Poll not found.");
    const previous = post.poll.votedOptionId;
    if (previous === optionId) return this.decoratePost(post, userId);
    if (previous) {
      const prev = post.poll.options.find((o) => o.id === previous);
      if (prev) prev.votes = Math.max(0, prev.votes - 1);
    }
    const next = post.poll.options.find((o) => o.id === optionId);
    if (!next) throw new ApiError(400, "Unknown poll option.");
    next.votes += 1;
    post.poll.votedOptionId = optionId;
    // Poll votes are per-post, so remember who voted via a synthetic reaction row.
    return this.decoratePost(post, userId);
  }

  // ------------------------------------------------------------- comments
  async listComments(postId: string): Promise<Comment[]> {
    const all = this.state.comments
      .filter((c) => c.postId === postId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const build = (parentId: string | null): Comment[] =>
      all
        .filter((c) => c.parentCommentId === parentId)
        .map((c) => {
          const author = this.state.users.get(c.userId);
          return {
            id: c.id,
            postId: c.postId,
            userId: c.userId,
            author: author ? toPublicUser(author) : null,
            parentCommentId: c.parentCommentId,
            content: c.content,
            createdAt: c.createdAt,
            replies: build(c.id),
          };
        });

    return build(null);
  }

  async createComment(input: CreateCommentInput): Promise<Comment> {
    const author = this.state.users.get(input.userId);
    this.state.comments.push({ ...input });
    return {
      id: input.id,
      postId: input.postId,
      userId: input.userId,
      author: author ? toPublicUser(author) : null,
      parentCommentId: input.parentCommentId,
      content: input.content,
      createdAt: input.createdAt,
      replies: [],
    };
  }

  // ----------------------------------------------------------- friendships
  private publicUserById(id: string): PublicUser | null {
    const user = this.state.users.get(id);
    return user ? toPublicUser(user) : null;
  }

  async listFriends(userId: string): Promise<FriendGraph> {
    const friends: PublicUser[] = [];
    const incoming: FriendGraph["incoming"] = [];
    const outgoing: FriendGraph["outgoing"] = [];
    const related = new Set<string>([userId]);

    for (const f of this.state.friendships) {
      if (f.requesterId !== userId && f.receiverId !== userId) continue;
      const otherId = f.requesterId === userId ? f.receiverId : f.requesterId;
      related.add(otherId);
      const user = this.publicUserById(otherId);
      if (!user) continue;
      if (f.status === "accepted") friends.push(user);
      else if (f.receiverId === userId) incoming.push({ id: f.id, user, createdAt: f.createdAt });
      else outgoing.push({ id: f.id, user, createdAt: f.createdAt });
    }

    const suggested = [...this.state.users.values()]
      .filter((u) => !related.has(u.id))
      .map(toPublicUser)
      .sort((a, b) => a.username.localeCompare(b.username));

    return { friends, incoming, outgoing, suggested };
  }

  async sendFriendRequest(requesterId: string, receiverId: string): Promise<Friendship> {
    if (requesterId === receiverId) throw new ApiError(400, "You cannot Cliq Up yourself.");
    const existing = this.state.friendships.find(
      (f) =>
        (f.requesterId === requesterId && f.receiverId === receiverId) ||
        (f.requesterId === receiverId && f.receiverId === requesterId),
    );
    if (existing) {
      if (existing.status === "pending" && existing.receiverId === requesterId) {
        // They already asked us — accept instead of duplicating.
        existing.status = "accepted";
      }
      return existing;
    }
    const friendship: Friendship = {
      id: `fr_${requesterId}_${receiverId}`,
      requesterId,
      receiverId,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    this.state.friendships.push(friendship);
    return friendship;
  }

  async respondFriendRequest(friendshipId: string, userId: string, accept: boolean): Promise<Friendship> {
    const friendship = this.state.friendships.find((f) => f.id === friendshipId);
    if (!friendship) throw new ApiError(404, "Friend request not found.");
    if (friendship.receiverId !== userId) throw new ApiError(403, "This request is not yours to answer.");
    if (accept) {
      friendship.status = "accepted";
      return friendship;
    }
    this.state.friendships = this.state.friendships.filter((f) => f.id !== friendshipId);
    return friendship;
  }

  // -------------------------------------------------------------- messages
  private decorateMessage(msg: StoredMessage, viewerId: string): Message {
    const counts = new Map<string, number>();
    let mine = false;
    for (const r of msg.reactions) {
      counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
      if (r.userId === viewerId) mine = true;
    }
    const reactions: MessageReaction[] = [...counts.entries()].map(([emoji, count]) => ({
      emoji,
      count,
      mine: msg.reactions.some((r) => r.emoji === emoji && r.userId === viewerId),
    }));
    if (!mine) reactions.sort((a, b) => b.count - a.count);

    let replyTo: Message["replyTo"] = null;
    if (msg.replyToId) {
      const parent = this.state.messages.find((m) => m.id === msg.replyToId);
      if (parent) replyTo = { id: parent.id, content: parent.content, senderId: parent.senderId };
    }

    return {
      id: msg.id,
      senderId: msg.senderId,
      receiverId: msg.receiverId,
      content: msg.content,
      mediaUrl: msg.mediaUrl,
      replyToId: msg.replyToId,
      replyTo,
      reactions,
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      fromMe: msg.senderId === viewerId,
    };
  }

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    const partners = new Set<string>();
    for (const m of this.state.messages) {
      if (m.senderId === userId) partners.add(m.receiverId);
      else if (m.receiverId === userId) partners.add(m.senderId);
    }
    // Include accepted friends so a user can start a fresh thread.
    for (const f of this.state.friendships) {
      if (f.status !== "accepted") continue;
      if (f.requesterId === userId) partners.add(f.receiverId);
      if (f.receiverId === userId) partners.add(f.requesterId);
    }

    const summaries: ConversationSummary[] = [];
    for (const partnerId of partners) {
      const partner = this.publicUserById(partnerId);
      if (!partner) continue;
      const thread = this.state.messages
        .filter(
          (m) =>
            (m.senderId === userId && m.receiverId === partnerId) ||
            (m.senderId === partnerId && m.receiverId === userId),
        )
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      const last = thread[thread.length - 1] ?? null;
      summaries.push({
        partner,
        lastMessage: last ? this.decorateMessage(last, userId) : null,
        unreadCount: thread.filter((m) => m.receiverId === userId && !m.isRead).length,
      });
    }

    return summaries.sort((a, b) =>
      (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? ""),
    );
  }

  async listMessages(userId: string, partnerId: string): Promise<Message[]> {
    return this.state.messages
      .filter(
        (m) =>
          (m.senderId === userId && m.receiverId === partnerId) ||
          (m.senderId === partnerId && m.receiverId === userId),
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      .map((m) => this.decorateMessage(m, userId));
  }

  async createMessage(input: CreateMessageInput): Promise<Message> {
    const msg: StoredMessage = { ...input, reactions: [], isRead: false };
    this.state.messages.push(msg);
    return this.decorateMessage(msg, input.senderId);
  }

  async deleteMessage(id: string, userId: string): Promise<boolean> {
    const msg = this.state.messages.find((m) => m.id === id);
    if (!msg) return false;
    if (msg.senderId !== userId) throw new ApiError(403, "You can only unsend your own messages.");
    this.state.messages = this.state.messages.filter((m) => m.id !== id);
    return true;
  }

  async setMessageReaction(messageId: string, userId: string, emoji: string): Promise<Message> {
    const msg = this.state.messages.find((m) => m.id === messageId);
    if (!msg) throw new ApiError(404, "Message not found.");
    const index = msg.reactions.findIndex((r) => r.userId === userId);
    if (index >= 0) {
      if (msg.reactions[index].emoji === emoji) msg.reactions.splice(index, 1);
      else msg.reactions[index].emoji = emoji;
    } else {
      msg.reactions.push({ userId, emoji });
    }
    return this.decorateMessage(msg, userId);
  }

  async markConversationRead(userId: string, partnerId: string): Promise<void> {
    for (const m of this.state.messages) {
      if (m.receiverId === userId && m.senderId === partnerId) m.isRead = true;
    }
  }
}

const globalForMemory = globalThis as unknown as { __cliqMemoryState?: MemoryState };

function freshState(): MemoryState {
  return {
    users: new Map(),
    posts: new Map(),
    reactions: [],
    comments: [],
    friendships: [],
    messages: [],
  };
}

export function getMemoryStore(): MemoryStore {
  if (!globalForMemory.__cliqMemoryState) {
    globalForMemory.__cliqMemoryState = freshState();
  }
  return new MemoryStore(globalForMemory.__cliqMemoryState);
}
