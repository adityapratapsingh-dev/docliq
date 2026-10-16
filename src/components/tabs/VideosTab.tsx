"use client";

import { useState } from "react";
import { Bookmark, Film, Heart, MessageCircle, Play, Send, Share2 } from "lucide-react";
import { useCliq } from "@/components/CliqProvider";
import { api } from "@/lib/api-client";
import { Avatar, EmptyState, IconButton, Modal, SkeletonCard } from "@/components/ui/Primitives";
import { CommentThread, HashtagText } from "@/components/ui/FeedBits";
import { matchesSearch, useComments, useFeed } from "@/components/tabs/useFeed";
import { ShareSheet } from "@/components/CreateModal";
import type { Post } from "@/types/cliq";
import { cx, timeAgo } from "@/lib/utils";

export function VideosTab({ search }: { search: string }) {
  const { posts, loading } = useFeed("video");
  const { setCreateOpen } = useCliq();

  const visible = posts.filter((p) => matchesSearch(p, search));

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-6">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (visible.length === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-4 py-10">
        <EmptyState
          icon={<Film size={26} />}
          title={search ? "No videos match that search" : "No videos on Cliq yet"}
          hint={
            search
              ? "Try a different vibe or clear the search bar."
              : "Be the first to post a Video! Paste an .mp4 link or upload a clip."
          }
          actionLabel={search ? undefined : "Post a Video"}
          onAction={search ? undefined : () => setCreateOpen(true)}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 px-3 py-4 sm:px-4">
      {visible.map((post) => (
        <VideoCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function VideoCard({ post }: { post: Post }) {
  const { user, toast, apiError, savedIds, toggleSaved } = useCliq();
  const [liked, setLiked] = useState(post.myReaction === "like");
  const [likes, setLikes] = useState(post.likesCount);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [broken, setBroken] = useState(false);

  const { comments, loading, add } = useComments(post.id, commentsOpen);

  const saved = savedIds.includes(post.id);

  async function toggleLike() {
    try {
      const { post: updated } = await api.react(post.id, "like");
      setLiked(updated.myReaction === "like");
      setLikes(updated.likesCount);
    } catch (error) {
      apiError(error);
    }
  }

  return (
    <article className="cliq-rise overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-md">
      <header className="flex items-center gap-3 px-4 py-3">
        {post.author ? <Avatar user={post.author} size={40} ring /> : <span className="h-10 w-10 rounded-full bg-zinc-800" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-100">{post.author?.displayName ?? "Cliq User"}</p>
          <p className="truncate text-[11px] text-zinc-500">
            @{post.author?.username ?? "unknown"} · {timeAgo(post.createdAt)}
          </p>
        </div>
      </header>

      <div className="relative aspect-[9/14] w-full bg-black sm:aspect-[4/5]">
        {post.mediaUrl && !broken ? (
          <video
            src={post.mediaUrl}
            className="absolute inset-0 h-full w-full object-cover"
            controls
            loop
            playsInline
            preload="metadata"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-violet-900/40 via-fuchsia-900/30 to-cyan-900/40">
            <div className="flex flex-col items-center gap-2 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-zinc-950/40 text-white backdrop-blur">
                <Play size={24} className="ml-0.5" />
              </span>
              <p className="text-xs text-zinc-400">
                {post.mediaUrl ? "This video can't play here" : "No video attached"}
              </p>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-transparent to-transparent" />
        <div className="absolute bottom-3 left-3 right-3">
          <p className="text-xs leading-relaxed text-zinc-100">
            <HashtagText text={post.content} />
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-0.5">
          <IconButton
            icon={<Heart size={20} className={cx(liked && "fill-current")} />}
            count={likes}
            active={liked}
            activeColor="#fb7185"
            onClick={toggleLike}
            title="Like"
          />
          <IconButton
            icon={<MessageCircle size={19} />}
            count={commentsOpen ? comments.length : post.commentCount}
            onClick={() => setCommentsOpen(true)}
            title="Comments"
          />
          <IconButton icon={<Share2 size={19} />} onClick={() => setShareOpen(true)} title="Share" />
        </div>
        <IconButton
          icon={<Bookmark size={19} className={cx(saved && "fill-current")} />}
          active={saved}
          onClick={() => {
            toggleSaved(post.id);
            toast(saved ? "Removed from Saved" : "Saved to your profile 🔖", saved ? "default" : "success");
          }}
          title="Save"
        />
      </div>

      <Modal open={commentsOpen} onClose={() => setCommentsOpen(false)} title="Comments" subtitle={`On @${post.author?.username ?? "unknown"}'s video`}>
        <CommentThread
          comments={comments}
          loading={loading}
          onReply={(parentId, text) => add(text, parentId)}
          canInteract={Boolean(user)}
          toxicFilter
        />
        <div className="sticky bottom-0 mt-4 flex items-center gap-2 border-t border-zinc-800/80 bg-zinc-900/95 pt-3">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                void add(draft);
                setDraft("");
              }
            }}
            placeholder="Add a comment on Cliq..."
            className="min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-950/70 px-3.5 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
          />
          <button
            type="button"
            aria-label="Post comment"
            onClick={() => {
              if (draft.trim()) {
                void add(draft);
                setDraft("");
              }
            }}
            className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent-grad)] text-white"
          >
            <Send size={15} />
          </button>
        </div>
      </Modal>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`@${post.author?.username ?? "unknown"}'s video`}
      />
    </article>
  );
}
