import { z } from 'zod';

/**
 * These schemas describe the shape of every piece of data in Cliq. Think of
 * each one as a form that every saved record must fill in. If a record is
 * missing a required field, or a field has the wrong type, zod rejects it
 * before it ever reaches the database. That keeps bad data out.
 *
 * Fields marked "optional" may be left empty. Fields marked "default" are
 * filled in automatically when not provided.
 */

// users: one record per person who signs up.
export const usersSchema = z.object({
  username: z.string(),
  email: z.string().optional(),
  passwordHash: z.string(),
  salt: z.string(),
  bio: z.string().optional(),
  avatarFileId: z.string().optional(),
  dateOfBirth: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// posts: one record per thing a user shares (text, photo or video).
export const postsSchema = z.object({
  userId: z.string(),
  username: z.string(),
  avatarFileId: z.string().optional(),
  content: z.string().optional(),
  postType: z.enum(['text', 'photo', 'video']),
  mediaFileId: z.string().optional(),
  thumbnailFileId: z.string().optional(),
  upgradeCount: z.number().default(0),
  commentCount: z.number().default(0),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// upgrades: one record each time a user "upgrades" (likes) a post.
export const upgradesSchema = z.object({
  postId: z.string(),
  userId: z.string(),
  createdAt: z.string(),
});

// interests: the master list of interests, for example "football" or "music".
export const interestsSchema = z.object({
  name: z.string(),
});

// user_interests: links a user to an interest. This is what powers
// "find friends by shared interests".
export const userInterestsSchema = z.object({
  userId: z.string(),
  interestId: z.string(),
  createdAt: z.string(),
});
