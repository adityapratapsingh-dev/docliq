import type {
  Comment,
  ConversationSummary,
  FriendGraph,
  Friendship,
  Message,
  Post,
  PostType,
  PublicUser,
  ReactionType,
  Settings,
} from "@/types/cliq";

/** A user as stored in the database (includes the password hash). */
export interface StoredUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  age: number | null;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  interests: string[];
  settings: Settings;
  createdAt: string;
}

export interface CreateUserInput {
  id: string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  age: number | null;
  bio: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  interests: string[];
  settings: Settings;
  createdAt: string;
}

export interface UpdateUserPatch {
  displayName?: string;
  bio?: string;
  age?: number | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  interests?: string[];
  settings?: Settings;
}

export interface CreatePostInput {
  id: string;
  userId: string;
  type: PostType;
  content: string;
  mediaUrl: string | null;
  flair: string | null;
  flairColor: string | null;
  pollOptions: { id: string; text: string }[] | null;
  createdAt: string;
}

export interface CreateCommentInput {
  id: string;
  postId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
}

export interface CreateMessageInput {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  mediaUrl: string | null;
  replyToId: string | null;
  createdAt: string;
}

export interface Store {
  readonly kind: "d1" | "memory";

  // users
  createUser(input: CreateUserInput): Promise<StoredUser>;
  getUserById(id: string): Promise<StoredUser | null>;
  getUserByUsername(username: string): Promise<StoredUser | null>;
  listUsers(excludeId: string): Promise<StoredUser[]>;
  updateUser(id: string, patch: UpdateUserPatch): Promise<StoredUser>;

  // posts
  listPosts(type: PostType, viewerId: string): Promise<Post[]>;
  getPost(id: string, viewerId: string): Promise<Post | null>;
  createPost(input: CreatePostInput): Promise<Post>;
  deletePost(id: string, userId: string): Promise<boolean>;
  setPostReaction(postId: string, userId: string, type: ReactionType): Promise<Post>;
  votePoll(postId: string, userId: string, optionId: string): Promise<Post>;

  // comments
  listComments(postId: string): Promise<Comment[]>;
  createComment(input: CreateCommentInput): Promise<Comment>;

  // friendships
  listFriends(userId: string): Promise<FriendGraph>;
  sendFriendRequest(requesterId: string, receiverId: string): Promise<Friendship>;
  respondFriendRequest(friendshipId: string, userId: string, accept: boolean): Promise<Friendship>;

  // messages
  listConversations(userId: string): Promise<ConversationSummary[]>;
  listMessages(userId: string, partnerId: string): Promise<Message[]>;
  createMessage(input: CreateMessageInput): Promise<Message>;
  deleteMessage(id: string, userId: string): Promise<boolean>;
  setMessageReaction(messageId: string, userId: string, emoji: string): Promise<Message>;
  markConversationRead(userId: string, partnerId: string): Promise<void>;
}

export function toPublicUser(user: StoredUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    age: user.age,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    bannerUrl: user.bannerUrl,
    interests: user.interests,
    createdAt: user.createdAt,
  };
}
