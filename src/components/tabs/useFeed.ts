"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { useCliq } from "@/components/CliqProvider";
import type { Comment, Post, PostType } from "@/types/cliq";

interface UseFeedResult {
  posts: Post[];
  loading: boolean;
  reload: () => Promise<void>;
  replacePost: (post: Post) => void;
  removePost: (id: string) => void;
}

/** Loads one post type from /api/posts, refetching whenever `revision` changes. */
export function useFeed(type: PostType): UseFeedResult {
  const { revision, apiError } = useCliq();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const next = await api.listPosts(type);
      setPosts(next);
    } catch (error) {
      apiError(error);
    } finally {
      setLoading(false);
    }
  }, [type, apiError]);

  useEffect(() => {
    void reload();
  }, [reload, revision]);

  const replacePost = useCallback((post: Post) => {
    setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
  }, []);

  const removePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { posts, loading, reload, replacePost, removePost };
}

interface UseCommentsResult {
  comments: Comment[];
  loading: boolean;
  add: (text: string, parentId?: string | null) => Promise<void>;
}

/** Loads the comment tree for a post on demand. */
export function useComments(postId: string, enabled: boolean): UseCommentsResult {
  const { apiError } = useCliq();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setComments(await api.listComments(postId));
    } catch (error) {
      apiError(error);
    } finally {
      setLoading(false);
    }
  }, [postId, apiError]);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const add = useCallback(
    async (text: string, parentId?: string | null) => {
      try {
        await api.addComment(postId, text, parentId ?? null);
        await load();
      } catch (error) {
        apiError(error);
      }
    },
    [postId, load, apiError],
  );

  return { comments, loading, add };
}

export function matchesSearch(post: Post, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().replace("#", "");
  return (
    post.content.toLowerCase().includes(q) ||
    (post.flair ?? "").toLowerCase().includes(q) ||
    (post.author?.username ?? "").toLowerCase().includes(q) ||
    (post.author?.displayName ?? "").toLowerCase().includes(q)
  );
}
