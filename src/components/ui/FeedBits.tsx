"use client";

import { useState, type ReactNode } from "react";
import { Heart, MessageCircle, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import type { Comment, PublicUser } from "@/types/cliq";
import { Avatar, IconButton, Spinner } from "@/components/ui/Primitives";
import { cx, formatCount, censor, timeAgo } from "@/lib/utils";

export function HashtagText({ text }: { text: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/gu);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="cursor-pointer font-semibold text-[var(--accent-2)] hover:underline">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

export function CommentThread({
  comments,
  loading,
  onReply,
  canInteract,
  toxicFilter,
}: {
  comments: Comment[];
  loading?: boolean;
  onReply: (parentId: string, text: string) => Promise<void>;
  canInteract: boolean;
  toxicFilter: boolean;
}) {
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  if (loading) {
    return (
      <p className="flex items-center gap-2 px-1 py-3 text-xs text-zinc-500">
        <Spinner /> Loading comments...
      </p>
    );
  }

  if (comments.length === 0) {
    return <p className="px-1 py-3 text-xs text-zinc-500">No comments yet — start the conversation 💬</p>;
  }

  async function submitReply(parentId: string) {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      await onReply(parentId, replyText);
      setReplyText("");
      setReplyTo(null);
    } finally {
      setSending(false);
    }
  }

  const renderComment = (comment: Comment, depth = 0): ReactNode => (
    <div key={comment.id} className={cx("space-y-2", depth > 0 && "ml-6 border-l border-zinc-800 pl-3")}>
      <div className="flex items-start gap-2.5">
        {comment.author ? (
          <Avatar user={comment.author} size={depth > 0 ? 26 : 30} />
        ) : (
          <span className="h-7 w-7 rounded-full bg-zinc-800" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 text-xs">
            <span className="font-semibold text-zinc-200">{comment.author?.displayName ?? "Cliq User"}</span>
            <span className="text-zinc-500">@{comment.author?.username ?? "unknown"}</span>
            <span className="text-zinc-600">· {timeAgo(comment.createdAt)}</span>
          </div>
          <p className="mt-0.5 text-sm text-zinc-300">
            <HashtagText text={censor(comment.content, toxicFilter)} />
          </p>
          {canInteract ? (
            <div className="mt-0.5">
              <IconButton
                icon={<MessageCircle size={13} />}
                label="Reply"
                onClick={() => setReplyTo((prev) => (prev === comment.id ? null : comment.id))}
                title="Reply"
              />
            </div>
          ) : null}
          {replyTo === comment.id ? (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={replyText}
                autoFocus
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void submitReply(comment.id);
                }}
                placeholder="Write a reply..."
                className="min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)]"
              />
              <button
                type="button"
                onClick={() => void submitReply(comment.id)}
                disabled={sending || !replyText.trim()}
                className="rounded-full bg-[var(--accent-grad)] p-1.5 text-white disabled:opacity-40"
                aria-label="Send reply"
              >
                {sending ? <Spinner /> : <Send size={13} />}
              </button>
            </div>
          ) : null}
        </div>
      </div>
      {comment.replies.map((r) => renderComment(r, depth + 1))}
    </div>
  );

  return <div className="space-y-3.5">{comments.map((c) => renderComment(c))}</div>;
}

export function VoteBar({
  score,
  vote,
  onUp,
  onDown,
  disabled,
  size = "md",
}: {
  score: number;
  vote: "up" | "down" | null;
  onUp: () => void;
  onDown: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs gap-1" : "px-3 py-1.5 text-sm gap-1.5";
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-zinc-800/80 bg-zinc-950/60 p-0.5">
      <button
        type="button"
        onClick={onUp}
        disabled={disabled}
        className={cx(
          "inline-flex items-center rounded-full font-bold transition disabled:opacity-40",
          pad,
          vote === "up"
            ? "bg-emerald-500/20 text-emerald-300"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-emerald-300",
        )}
      >
        <ThumbsUp size={size === "sm" ? 12 : 14} className={vote === "up" ? "fill-current" : ""} />
        {size === "md" ? "Upgrade" : null}
      </button>
      <span
        className={cx(
          "min-w-9 text-center font-bold tabular-nums",
          size === "sm" ? "text-xs" : "text-sm",
          score > 0 ? "text-emerald-300" : score < 0 ? "text-rose-300" : "text-zinc-400",
        )}
      >
        {formatCount(score)}
      </span>
      <button
        type="button"
        onClick={onDown}
        disabled={disabled}
        className={cx(
          "inline-flex items-center rounded-full font-bold transition disabled:opacity-40",
          pad,
          vote === "down" ? "bg-rose-500/20 text-rose-300" : "text-zinc-400 hover:bg-zinc-800 hover:text-rose-300",
        )}
      >
        <ThumbsDown size={size === "sm" ? 12 : 14} className={vote === "down" ? "fill-current" : ""} />
        {size === "md" ? "Downgrade" : null}
      </button>
    </div>
  );
}

export function LikePair({
  likes,
  liked,
  dislikes,
  disliked,
  hideDislikes,
  onLike,
  onDislike,
  disabled,
}: {
  likes: number;
  liked: boolean;
  dislikes: number;
  disliked: boolean;
  hideDislikes?: boolean;
  onLike: () => void;
  onDislike: () => void;
  disabled?: boolean;
}) {
  return (
    <>
      <IconButton
        icon={<Heart size={19} className={liked ? "fill-current" : ""} />}
        count={formatCount(likes)}
        active={liked}
        activeColor="#fb7185"
        onClick={onLike}
        disabled={disabled}
        title="Like"
      />
      <IconButton
        icon={disliked ? <ThumbsDown size={19} className="fill-current" /> : <ThumbsUp size={19} />}
        count={hideDislikes ? "—" : formatCount(dislikes)}
        active={disliked}
        activeColor="#fb923c"
        onClick={onDislike}
        disabled={disabled}
        title="Dislike"
      />
    </>
  );
}

export function AuthorLine({ user, meta }: { user: PublicUser | null; meta: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span className="truncate text-sm font-bold text-zinc-100">{user?.displayName ?? "Cliq User"}</span>
        <span className="truncate text-[11px] text-zinc-500">@{user?.username ?? "unknown"}</span>
      </div>
      <p className="truncate text-[11px] text-zinc-500">{meta}</p>
    </div>
  );
}
