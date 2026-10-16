"use client";

import { useState } from "react";
import { Film, Heart, Image as ImageIcon, MessageSquare, Play, Trash2, ThumbsDown, ThumbsUp } from "lucide-react";
import { useCliq } from "@/components/CliqProvider";
import { api } from "@/lib/api-client";
import { ArtBlock, Avatar, Spinner } from "@/components/ui/Primitives";
import { HashtagText } from "@/components/ui/FeedBits";
import { flairColor } from "@/lib/constants";
import type { Post } from "@/types/cliq";
import { cx, formatCount, timeAgo } from "@/lib/utils";

/** Compact post tile used on the Profile tabs and Saved list. */
export function PostCardMini({ post, viewerId }: { post: Post; viewerId: string }) {
  const { bump, toast, apiError } = useCliq();
  const [broken, setBroken] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [gone, setGone] = useState(false);

  if (gone) return null;

  const mine = post.userId === viewerId;
  const isChat = post.type === "chat";
  const isVideo = post.type === "video";

  async function remove() {
    setDeleting(true);
    try {
      await api.deletePost(post.id);
      setGone(true);
      toast("Post deleted", "default");
      bump();
    } catch (error) {
      apiError(error);
    } finally {
      setDeleting(false);
    }
  }

  const icon = isVideo ? <Film size={13} /> : post.type === "photo" ? <ImageIcon size={13} /> : <MessageSquare size={13} />;

  return (
    <div className="cliq-rise overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/70">
      {!isChat ? (
        <div className="relative h-36 w-full bg-zinc-950">
          {post.mediaUrl && !broken ? (
            isVideo ? (
              <>
                <video
                  src={post.mediaUrl}
                  className="h-full w-full object-cover"
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  onError={() => setBroken(true)}
                />
                <span className="pointer-events-none absolute inset-0 grid place-items-center">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-zinc-950/50 text-white backdrop-blur">
                    <Play size={16} className="ml-0.5" />
                  </span>
                </span>
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.mediaUrl}
                alt={post.content || "post media"}
                className="h-full w-full object-cover"
                onError={() => setBroken(true)}
              />
            )
          ) : (
            <ArtBlock seed={post.id} emoji={isVideo ? "🎬" : "📸"} className="h-full w-full" />
          )}
        </div>
      ) : null}

      <div className="p-3">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent-2)]">
            {icon}
          </span>
          {isChat && post.flair ? (
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-bold"
              style={{
                borderColor: `${flairColor(post.flair)}66`,
                color: flairColor(post.flair),
                backgroundColor: `${flairColor(post.flair)}18`,
              }}
            >
              {post.flair}
            </span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              {isVideo ? "Video" : post.type === "photo" ? "Photo" : "Post"}
            </span>
          )}
          <span className="ml-auto text-[10px] text-zinc-500">{timeAgo(post.createdAt)}</span>
        </div>

        {post.author && !mine ? (
          <div className="mt-2 flex items-center gap-2">
            <Avatar user={post.author} size={22} />
            <span className="truncate text-[11px] text-zinc-400">@{post.author.username}</span>
          </div>
        ) : null}

        {post.content ? (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-zinc-300">
            <HashtagText text={post.content} />
          </p>
        ) : null}

        <div className="mt-2.5 flex items-center gap-3 text-[11px] text-zinc-500">
          <span className="inline-flex items-center gap-1">
            <Heart size={12} /> {formatCount(post.likesCount)}
          </span>
          {!isChat ? (
            <span className="inline-flex items-center gap-1">
              <ThumbsDown size={12} /> {formatCount(post.dislikesCount)}
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 text-emerald-400/80">
                <ThumbsUp size={12} /> {formatCount(post.upgradesCount)}
              </span>
              <span className="inline-flex items-center gap-1 text-rose-400/80">
                <ThumbsDown size={12} /> {formatCount(post.downgradesCount)}
              </span>
            </>
          )}
          <span className="inline-flex items-center gap-1">
            <MessageSquare size={12} /> {post.commentCount}
          </span>
          {mine ? (
            <button
              type="button"
              onClick={() => void remove()}
              disabled={deleting}
              className={cx(
                "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold transition",
                "text-rose-300 hover:bg-rose-500/10",
              )}
            >
              {deleting ? <Spinner className="h-3 w-3" /> : <Trash2 size={12} />} Delete
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
