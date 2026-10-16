import { DEFAULT_SETTINGS, ApiError } from "@/types/cliq";
import type {
  Comment,
  ConversationSummary,
  FriendGraph,
  Friendship,
  Message,
  MessageReaction,
  Poll,
  Post,
  PostType,
  PublicUser,
  ReactionType,
  Settings,
} from "@/types/cliq";
import { d1Batch, d1Query } from "@/lib/d1";
import { ensureTablesExist } from "@/lib/d1-schema";
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

interface UserRow {
  id: string;
  username: string;
  display_name: string;
  email: string | null;
  password_hash: string;
  age: number | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  interests: string | null;
  settings: string | null;
  created_at: string;
}

interface PostRow {
  id: string;
  user_id: string;
  type: string;
  content: string | null;
  media_url: string | null;
  flair: string | null;
  poll_data: string | null;
  likes_count: number;
  dislikes_count: number;
  upgrades_count: number;
  downgrades_count: number;
  created_at: string;
  comment_count?: number;
  my_reaction?: string | null;
}

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  parent_comment_id: string | null;
  content: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string | null;
  media_url: string | null;
  reply_to_id: string | null;
  reactions: string | null;
  is_read: number;
  created_at: string;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
}

interface PollData {
  options: { id: string; text: string; votes: number }[];
  votes: Record<string, string>;
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToUser(row: UserRow): StoredUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    email: row.email ?? "",
    passwordHash: row.password_hash,
    age: row.age ?? null,
    bio: row.bio ?? "",
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url,
    interests: parseJson<string[]>(row.interests, []),
    settings: { ...DEFAULT_SETTINGS, ...parseJson<Partial<Settings>>(row.settings, {}) },
    createdAt: row.created_at,
  };
}

export class D1Store implements Store {
  readonly kind = "d1" as const;

  private async ready(): Promise<void> {
    await ensureTablesExist();
  }

  // ---------------------------------------------------------------- users
  async createUser(input: CreateUserInput): Promise<StoredUser> {
    await this.ready();
    const username = input.username.toLowerCase();
    const existing = await this.getUserByUsername(username);
    if (existing) throw new ApiError(409, "That @username is already taken.");

    await d1Query(
      `INSERT INTO users (id, username, display_name, email, password_hash, age, bio, avatar_url, banner_url, interests, settings, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        username,
        input.displayName,
        input.email,
        input.passwordHash,
        input.age,
        input.bio,
        input.avatarUrl,
        input.bannerUrl,
        JSON.stringify(input.interests),
        JSON.stringify(input.settings),
        input.createdAt,
      ],
    );
    return { ...input, username };
  }

  async getUserById(id: string): Promise<StoredUser | null> {
    await this.ready();
    const rows = await d1Query<UserRow>("SELECT * FROM users WHERE id = ? LIMIT 1", [id]);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async getUserByUsername(username: string): Promise<StoredUser | null> {
    await this.ready();
    const rows = await d1Query<UserRow>("SELECT * FROM users WHERE lower(username) = lower(?) LIMIT 1", [username]);
    return rows[0] ? rowToUser(rows[0]) : null;
  }

  async listUsers(excludeId: string): Promise<StoredUser[]> {
    await this.ready();
    const rows = await d1Query<UserRow>(
      "SELECT * FROM users WHERE id != ? ORDER BY lower(username) ASC",
      [excludeId],
    );
    return rows.map(rowToUser);
  }

  async updateUser(id: string, patch: UpdateUserPatch): Promise<StoredUser> {
    await this.ready();
    const current = await this.getUserById(id);
    if (!current) throw new ApiError(404, "User not found.");

    const next: StoredUser = {
      ...current,
      displayName: patch.displayName !== undefined ? patch.displayName : current.displayName,
      bio: patch.bio !== undefined ? patch.bio : current.bio,
      age: patch.age !== undefined ? patch.age : current.age,
      avatarUrl: patch.avatarUrl !== undefined ? patch.avatarUrl : current.avatarUrl,
      bannerUrl: patch.bannerUrl !== undefined ? patch.bannerUrl : current.bannerUrl,
      interests: patch.interests !== undefined ? patch.interests : current.interests,
      settings: patch.settings !== undefined ? patch.settings : current.settings,
    };

    await d1Query(
      `UPDATE users SET display_name = ?, bio = ?, age = ?, avatar_url = ?, banner_url = ?, interests = ?, settings = ? WHERE id = ?`,
      [
        next.displayName,
        next.bio,
        next.age,
        next.avatarUrl,
        next.bannerUrl,
        JSON.stringify(next.interests),
        JSON.stringify(next.settings),
        id,
      ],
    );
    return next;
  }

  // ---------------------------------------------------------------- posts
  private decoratePost(row: PostRow, author: StoredUser | null, viewerId: string): Post {
    const pollData = parseJson<PollData | null>(row.poll_data, null);
    let poll: Poll | null = null;
    if (pollData) {
      poll = {
        options: pollData.options.map((o) => ({ ...o, votes: Number(o.votes) || 0 })),
        votedOptionId: pollData.votes?.[viewerId] ?? null,
      };
    }
    const reaction = (row.my_reaction as ReactionType | null) ?? null;
    return {
      id: row.id,
      userId: row.user_id,
      author: author ? toPublicUser(author) : null,
      type: row.type as PostType,
      content: row.content ?? "",
      mediaUrl: row.media_url,
      flair: row.flair,
      flairColor: null,
      poll,
      likesCount: Number(row.likes_count) || 0,
      dislikesCount: Number(row.dislikes_count) || 0,
      upgradesCount: Number(row.upgrades_count) || 0,
      downgradesCount: Number(row.downgrades_count) || 0,
      commentCount: Number(row.comment_count) || 0,
      myReaction: reaction,
      createdAt: row.created_at,
    };
  }

  private async fetchPostRow(id: string, viewerId: string): Promise<PostRow | null> {
    const rows = await d1Query<PostRow>(
      `SELECT p.*,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
              (SELECT reaction_type FROM post_reactions r WHERE r.post_id = p.id AND r.user_id = ?) AS my_reaction
       FROM posts p WHERE p.id = ? LIMIT 1`,
      [viewerId, id],
    );
    return rows[0] ?? null;
  }

  async listPosts(type: PostType, viewerId: string): Promise<Post[]> {
    await this.ready();
    const rows = await d1Query<PostRow>(
      `SELECT p.*,
              (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
              (SELECT reaction_type FROM post_reactions r WHERE r.post_id = p.id AND r.user_id = ?) AS my_reaction
       FROM posts p WHERE p.type = ? ORDER BY p.created_at DESC`,
      [viewerId, type],
    );
    if (rows.length === 0) return [];
    const authorIds = [...new Set(rows.map((r) => r.user_id))];
    const users = await this.usersByIds(authorIds);
    return rows.map((row) => this.decoratePost(row, users.get(row.user_id) ?? null, viewerId));
  }

  private async usersByIds(ids: string[]): Promise<Map<string, StoredUser>> {
    const map = new Map<string, StoredUser>();
    if (ids.length === 0) return map;
    const placeholders = ids.map(() => "?").join(", ");
    const rows = await d1Query<UserRow>(`SELECT * FROM users WHERE id IN (${placeholders})`, ids);
    for (const row of rows) map.set(row.id, rowToUser(row));
    return map;
  }

  async getPost(id: string, viewerId: string): Promise<Post | null> {
    await this.ready();
    const row = await this.fetchPostRow(id, viewerId);
    if (!row) return null;
    const author = await this.getUserById(row.user_id);
    return this.decoratePost(row, author, viewerId);
  }

  async createPost(input: CreatePostInput): Promise<Post> {
    await this.ready();
    const pollData: PollData | null = input.pollOptions?.length
      ? { options: input.pollOptions.map((o) => ({ ...o, votes: 0 })), votes: {} }
      : null;

    await d1Query(
      `INSERT INTO posts (id, user_id, type, content, media_url, flair, poll_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.userId,
        input.type,
        input.content,
        input.mediaUrl,
        input.flair,
        pollData ? JSON.stringify(pollData) : null,
        input.createdAt,
      ],
    );
    const post = await this.getPost(input.id, input.userId);
    if (!post) throw new ApiError(500, "Failed to create post.");
    return post;
  }

  async deletePost(id: string, userId: string): Promise<boolean> {
    await this.ready();
    const rows = await d1Query<{ user_id: string }>("SELECT user_id FROM posts WHERE id = ? LIMIT 1", [id]);
    if (rows.length === 0) return false;
    if (rows[0].user_id !== userId) throw new ApiError(403, "You can only delete your own posts.");
    await d1Batch([
      { sql: "DELETE FROM posts WHERE id = ?", params: [id] },
      { sql: "DELETE FROM post_reactions WHERE post_id = ?", params: [id] },
      { sql: "DELETE FROM comments WHERE post_id = ?", params: [id] },
    ]);
    return true;
  }

  async setPostReaction(postId: string, userId: string, type: ReactionType): Promise<Post> {
    await this.ready();
    const post = await this.getPost(postId, userId);
    if (!post) throw new ApiError(404, "Post not found.");

    const existing = await d1Query<{ reaction_type: string }>(
      "SELECT reaction_type FROM post_reactions WHERE post_id = ? AND user_id = ? LIMIT 1",
      [postId, userId],
    );
    const previous = existing[0]?.reaction_type as ReactionType | undefined;

    const columnFor = (t: ReactionType) =>
      t === "like"
        ? "likes_count"
        : t === "dislike"
          ? "dislikes_count"
          : t === "upgrade"
            ? "upgrades_count"
            : "downgrades_count";

    const statements: { sql: string; params?: unknown[] }[] = [];

    if (previous) {
      statements.push({
        sql: `UPDATE posts SET ${columnFor(previous)} = MAX(0, ${columnFor(previous)} - 1) WHERE id = ?`,
        params: [postId],
      });
      statements.push({ sql: "DELETE FROM post_reactions WHERE post_id = ? AND user_id = ?", params: [postId, userId] });
    }

    if (!previous || previous !== type) {
      statements.push({
        sql: "INSERT INTO post_reactions (id, post_id, user_id, reaction_type, created_at) VALUES (?, ?, ?, ?, ?)",
        params: [`pr_${postId}_${userId}`, postId, userId, type, new Date().toISOString()],
      });
      statements.push({
        sql: `UPDATE posts SET ${columnFor(type)} = ${columnFor(type)} + 1 WHERE id = ?`,
        params: [postId],
      });
    }

    if (statements.length > 0) await d1Batch(statements);
    const updated = await this.getPost(postId, userId);
    if (!updated) throw new ApiError(404, "Post not found.");
    return updated;
  }

  async votePoll(postId: string, userId: string, optionId: string): Promise<Post> {
    await this.ready();
    const rows = await d1Query<{ poll_data: string | null }>("SELECT poll_data FROM posts WHERE id = ? LIMIT 1", [
      postId,
    ]);
    if (rows.length === 0) throw new ApiError(404, "Post not found.");
    const data = parseJson<PollData | null>(rows[0].poll_data, null);
    if (!data) throw new ApiError(404, "This post has no poll.");

    const previous = data.votes?.[userId];
    if (previous === optionId) {
      const post = await this.getPost(postId, userId);
      if (!post) throw new ApiError(404, "Post not found.");
      return post;
    }
    if (previous) {
      const prevOption = data.options.find((o) => o.id === previous);
      if (prevOption) prevOption.votes = Math.max(0, Number(prevOption.votes) - 1);
    }
    const option = data.options.find((o) => o.id === optionId);
    if (!option) throw new ApiError(400, "Unknown poll option.");
    option.votes = (Number(option.votes) || 0) + 1;
    data.votes = { ...(data.votes ?? {}), [userId]: optionId };

    await d1Query("UPDATE posts SET poll_data = ? WHERE id = ?", [JSON.stringify(data), postId]);
    const post = await this.getPost(postId, userId);
    if (!post) throw new ApiError(404, "Post not found.");
    return post;
  }

  // ------------------------------------------------------------- comments
  async listComments(postId: string): Promise<Comment[]> {
    await this.ready();
    const rows = await d1Query<CommentRow>(
      "SELECT * FROM comments WHERE post_id = ? ORDER BY created_at ASC",
      [postId],
    );
    const users = await this.usersByIds([...new Set(rows.map((r) => r.user_id))]);

    const toComment = (row: CommentRow): Comment => {
      const author = users.get(row.user_id);
      return {
        id: row.id,
        postId: row.post_id,
        userId: row.user_id,
        author: author ? toPublicUser(author) : null,
        parentCommentId: row.parent_comment_id,
        content: row.content,
        createdAt: row.created_at,
        replies: [],
      };
    };

    const byId = new Map<string, Comment>();
    for (const row of rows) byId.set(row.id, toComment(row));

    const roots: Comment[] = [];
    for (const row of rows) {
      const comment = byId.get(row.id);
      if (!comment) continue;
      if (row.parent_comment_id && byId.has(row.parent_comment_id)) {
        byId.get(row.parent_comment_id)?.replies.push(comment);
      } else {
        roots.push(comment);
      }
    }
    return roots;
  }

  async createComment(input: CreateCommentInput): Promise<Comment> {
    await this.ready();
    await d1Query(
      "INSERT INTO comments (id, post_id, user_id, parent_comment_id, content, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [input.id, input.postId, input.userId, input.parentCommentId, input.content, input.createdAt],
    );
    const author = await this.getUserById(input.userId);
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
  async listFriends(userId: string): Promise<FriendGraph> {
    await this.ready();
    const rows = await d1Query<FriendshipRow>(
      "SELECT * FROM friendships WHERE requester_id = ? OR receiver_id = ?",
      [userId, userId],
    );
    const relatedIds = new Set<string>([userId]);
    for (const row of rows) {
      relatedIds.add(row.requester_id === userId ? row.receiver_id : row.requester_id);
    }
    const users = await this.usersByIds([...relatedIds]);
    const allUsers = await this.listUsers(userId);

    const friends: PublicUser[] = [];
    const incoming: FriendGraph["incoming"] = [];
    const outgoing: FriendGraph["outgoing"] = [];

    for (const row of rows) {
      const otherId = row.requester_id === userId ? row.receiver_id : row.requester_id;
      const other = users.get(otherId);
      if (!other) continue;
      const pub = toPublicUser(other);
      if (row.status === "accepted") friends.push(pub);
      else if (row.receiver_id === userId) incoming.push({ id: row.id, user: pub, createdAt: row.created_at });
      else outgoing.push({ id: row.id, user: pub, createdAt: row.created_at });
    }

    const suggested = allUsers
      .filter((u) => !relatedIds.has(u.id))
      .map(toPublicUser);

    return { friends, incoming, outgoing, suggested };
  }

  async sendFriendRequest(requesterId: string, receiverId: string): Promise<Friendship> {
    await this.ready();
    if (requesterId === receiverId) throw new ApiError(400, "You cannot Cliq Up yourself.");

    const existing = await d1Query<FriendshipRow>(
      `SELECT * FROM friendships
       WHERE (requester_id = ? AND receiver_id = ?) OR (requester_id = ? AND receiver_id = ?)
       LIMIT 1`,
      [requesterId, receiverId, receiverId, requesterId],
    );

    if (existing[0]) {
      const row = existing[0];
      if (row.status === "pending" && row.receiver_id === requesterId) {
        await d1Query("UPDATE friendships SET status = 'accepted' WHERE id = ?", [row.id]);
        return {
          id: row.id,
          requesterId: row.requester_id,
          receiverId: row.receiver_id,
          status: "accepted",
          createdAt: row.created_at,
        };
      }
      return {
        id: row.id,
        requesterId: row.requester_id,
        receiverId: row.receiver_id,
        status: row.status as Friendship["status"],
        createdAt: row.created_at,
      };
    }

    const id = `fr_${requesterId}_${receiverId}`;
    const createdAt = new Date().toISOString();
    await d1Query(
      "INSERT INTO friendships (id, requester_id, receiver_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
      [id, requesterId, receiverId, createdAt],
    );
    return { id, requesterId, receiverId, status: "pending", createdAt };
  }

  async respondFriendRequest(friendshipId: string, userId: string, accept: boolean): Promise<Friendship> {
    await this.ready();
    const rows = await d1Query<FriendshipRow>("SELECT * FROM friendships WHERE id = ? LIMIT 1", [friendshipId]);
    if (rows.length === 0) throw new ApiError(404, "Friend request not found.");
    const row = rows[0];
    if (row.receiver_id !== userId) throw new ApiError(403, "This request is not yours to answer.");

    if (accept) {
      await d1Query("UPDATE friendships SET status = 'accepted' WHERE id = ?", [friendshipId]);
      return {
        id: row.id,
        requesterId: row.requester_id,
        receiverId: row.receiver_id,
        status: "accepted",
        createdAt: row.created_at,
      };
    }
    await d1Query("DELETE FROM friendships WHERE id = ?", [friendshipId]);
    return {
      id: row.id,
      requesterId: row.requester_id,
      receiverId: row.receiver_id,
      status: "pending",
      createdAt: row.created_at,
    };
  }

  // -------------------------------------------------------------- messages
  private decorateMessage(row: MessageRow, viewerId: string, parents: Map<string, MessageRow>): Message {
    const raw = parseJson<{ userId: string; emoji: string }[]>(row.reactions, []);
    const counts = new Map<string, number>();
    for (const r of raw) counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1);
    const reactions: MessageReaction[] = [...counts.entries()].map(([emoji, count]) => ({
      emoji,
      count,
      mine: raw.some((r) => r.emoji === emoji && r.userId === viewerId),
    }));

    let replyTo: Message["replyTo"] = null;
    if (row.reply_to_id) {
      const parent = parents.get(row.reply_to_id);
      if (parent) replyTo = { id: parent.id, content: parent.content ?? "", senderId: parent.sender_id };
    }

    return {
      id: row.id,
      senderId: row.sender_id,
      receiverId: row.receiver_id,
      content: row.content ?? "",
      mediaUrl: row.media_url,
      replyToId: row.reply_to_id,
      replyTo,
      reactions,
      isRead: Number(row.is_read) === 1,
      createdAt: row.created_at,
      fromMe: row.sender_id === viewerId,
    };
  }

  async listConversations(userId: string): Promise<ConversationSummary[]> {
    await this.ready();
    const rows = await d1Query<MessageRow>(
      `SELECT * FROM messages WHERE sender_id = ? OR receiver_id = ? ORDER BY created_at ASC`,
      [userId, userId],
    );

    const partners = new Set<string>();
    for (const row of rows) partners.add(row.sender_id === userId ? row.receiver_id : row.sender_id);

    const friendRows = await d1Query<FriendshipRow>(
      "SELECT * FROM friendships WHERE (requester_id = ? OR receiver_id = ?) AND status = 'accepted'",
      [userId, userId],
    );
    for (const row of friendRows) partners.add(row.requester_id === userId ? row.receiver_id : row.requester_id);

    if (partners.size === 0) return [];
    const users = await this.usersByIds([...partners]);
    const parentMap = new Map(rows.map((r) => [r.id, r]));

    const summaries: ConversationSummary[] = [];
    for (const partnerId of partners) {
      const partner = users.get(partnerId);
      if (!partner) continue;
      const thread = rows.filter(
        (r) =>
          (r.sender_id === userId && r.receiver_id === partnerId) ||
          (r.sender_id === partnerId && r.receiver_id === userId),
      );
      const last = thread[thread.length - 1] ?? null;
      summaries.push({
        partner: toPublicUser(partner),
        lastMessage: last ? this.decorateMessage(last, userId, parentMap) : null,
        unreadCount: thread.filter((r) => r.receiver_id === userId && Number(r.is_read) === 0).length,
      });
    }

    return summaries.sort((a, b) =>
      (b.lastMessage?.createdAt ?? "").localeCompare(a.lastMessage?.createdAt ?? ""),
    );
  }

  async listMessages(userId: string, partnerId: string): Promise<Message[]> {
    await this.ready();
    const rows = await d1Query<MessageRow>(
      `SELECT * FROM messages
       WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [userId, partnerId, partnerId, userId],
    );
    const parentMap = new Map(rows.map((r) => [r.id, r]));
    return rows.map((r) => this.decorateMessage(r, userId, parentMap));
  }

  async createMessage(input: CreateMessageInput): Promise<Message> {
    await this.ready();
    await d1Query(
      `INSERT INTO messages (id, sender_id, receiver_id, content, media_url, reply_to_id, reactions, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, ?, '[]', 0, ?)`,
      [input.id, input.senderId, input.receiverId, input.content, input.mediaUrl, input.replyToId, input.createdAt],
    );
    let replyTo: Message["replyTo"] = null;
    if (input.replyToId) {
      const parent = await d1Query<MessageRow>("SELECT * FROM messages WHERE id = ? LIMIT 1", [input.replyToId]);
      if (parent[0]) {
        replyTo = { id: parent[0].id, content: parent[0].content ?? "", senderId: parent[0].sender_id };
      }
    }
    return {
      id: input.id,
      senderId: input.senderId,
      receiverId: input.receiverId,
      content: input.content,
      mediaUrl: input.mediaUrl,
      replyToId: input.replyToId,
      replyTo,
      reactions: [],
      isRead: false,
      createdAt: input.createdAt,
      fromMe: true,
    };
  }

  async deleteMessage(id: string, userId: string): Promise<boolean> {
    await this.ready();
    const rows = await d1Query<{ sender_id: string }>("SELECT sender_id FROM messages WHERE id = ? LIMIT 1", [id]);
    if (rows.length === 0) return false;
    if (rows[0].sender_id !== userId) throw new ApiError(403, "You can only unsend your own messages.");
    await d1Query("DELETE FROM messages WHERE id = ?", [id]);
    return true;
  }

  async setMessageReaction(messageId: string, userId: string, emoji: string): Promise<Message> {
    await this.ready();
    const rows = await d1Query<MessageRow>("SELECT * FROM messages WHERE id = ? LIMIT 1", [messageId]);
    if (rows.length === 0) throw new ApiError(404, "Message not found.");
    const row = rows[0];
    const raw = parseJson<{ userId: string; emoji: string }[]>(row.reactions, []);
    const index = raw.findIndex((r) => r.userId === userId);
    if (index >= 0) {
      if (raw[index].emoji === emoji) raw.splice(index, 1);
      else raw[index].emoji = emoji;
    } else {
      raw.push({ userId, emoji });
    }
    await d1Query("UPDATE messages SET reactions = ? WHERE id = ?", [JSON.stringify(raw), messageId]);
    const updated: MessageRow = { ...row, reactions: JSON.stringify(raw) };
    const parentMap = new Map<string, MessageRow>();
    if (row.reply_to_id) {
      const parent = await d1Query<MessageRow>("SELECT * FROM messages WHERE id = ? LIMIT 1", [row.reply_to_id]);
      if (parent[0]) parentMap.set(parent[0].id, parent[0]);
    }
    return this.decorateMessage(updated, userId, parentMap);
  }

  async markConversationRead(userId: string, partnerId: string): Promise<void> {
    await this.ready();
    await d1Query("UPDATE messages SET is_read = 1 WHERE receiver_id = ? AND sender_id = ?", [userId, partnerId]);
  }
}
