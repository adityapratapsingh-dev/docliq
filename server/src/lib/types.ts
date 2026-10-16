import { z } from 'zod';
import {
  usersSchema,
  postsSchema,
  upgradesSchema,
  interestsSchema,
  userInterestsSchema,
} from '../schemas';

/**
 * These types are generated automatically from the schemas, so there is only
 * one source of truth. If a schema changes, the matching type changes with it
 * and TypeScript will point out every place that needs updating. That removes
 * a whole class of bugs where the code and the data shape drift apart.
 */

export type User = z.infer<typeof usersSchema>;
export type Post = z.infer<typeof postsSchema>;
export type Upgrade = z.infer<typeof upgradesSchema>;
export type Interest = z.infer<typeof interestsSchema>;
export type UserInterest = z.infer<typeof userInterestsSchema>;

/**
 * The names of the collections as they appear in Telegram. We keep them in one
 * place so nothing has to remember the exact spelling.
 */
export const COLLECTIONS = {
  users: 'users',
  posts: 'posts',
  upgrades: 'upgrades',
  interests: 'interests',
  userInterests: 'user_interests',
} as const;
