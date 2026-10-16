"use client";

import { useState } from "react";
import { Bookmark, MessageCircle, MessageSquare, Repeat, Send, Share2, Sparkles, TrendingUp, Vote } from "lucide-react";
import { useCliq } from "@/components/CliqProvider";
import { api } from "@/lib/api-client";
import { Avatar, EmptyState, IconButton, SkeletonCard } from "@/components/ui/Primitives";
import { CommentThread, HashtagText, VoteBar } from "@/components/ui/FeedBits";
import { ShareSheet } from "@/components/CreateModal";
import { matchesSearch, useComments, useFeed } from "@/components/tabs/useFeed";
import { FLAIRS, flairColor } from "@/lib/constants";
import type { Post } from "@/types/cliq";
import { censor, cx, formatCount, timeAgo } from "@/lib/utils";

export function ChatPostsTab({ search }: { search: string }) {
  const { posts, loading } = useFeed("chat");
  const { setCreateOpen } = useCliq();

  const visible = posts.filter((p) => matchesSearch(p, search));

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-3 py-4 sm:px-4">
      <Composer />

      <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-2.5">
        <TrendingUp size={15} className="text-[var(--accent-2)]" />
        <p className="text-xs font-semibold text-zinc-300">Topic flairs</p>
        <div className="cliq-no-bar flex flex-1 gap-2 overflow-x-auto">
          {FLAIRS.map((f) => (
            <span key={f.label} className="shrink-0 text-[11px] font-semibold" style={{ color: f.color }}>
              {f.label}
            </span>
          ))}
        </div>
      </div>

      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={26} />}
          title={search ? "No chat posts match that search" : "No chat posts on Cliq yet"}
          hint={
            search
              ? "Try a different vibe or clear the search bar."
              : "Drop a thought on Cliq — ask a question, share a hot take, or start a poll."
          }
          actionLabel={search ? undefined : "Write a Chat Post"}
          onAction={search ? undefined : () => setCreateOpen(true)}
        />
      ) : (
        visible.map((post) => <ChatPostCard key={post.id} post={post} />)
      )}
    </div>
  );
}

function Composer() {
  const { user, toast, apiError, bump, settings } = useCliq();
  const [text, setText] = useState("");
  const [flair, setFlair] = useState(FLAIRS[0]);
  const [pollMode, setPollMode] = useState(false);
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      await api.createPost({
        type: "chat",
        content: text.trim(),
        flair: flair.label,
        pollOptions: pollMode ? options.filter((o) => o.trim()) : [],
      });
      setText("");
      setPollMode(false);
      setOptions(["", ""]);
      bump();
      toast("Thought dropped on Cliq ⚡", "success");
    } catch (error) {
      apiError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/80 p-4 backdrop-blur-md">
      <div className="flex gap-3">
        {user ? <Avatar user={user} size={40} /> : null}
        <div className="min-w-0 flex-1">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Drop a thought on Cliq..."
            className="w-full resize-none bg-transparent text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FLAIRS.map((f) => (
              <button
                key={f.label}
                type="button"
                onClick={() => setFlair(f)}
                className="rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition"
                style={
                  flair.label === f.label
                    ? { background: f.color, borderColor: f.color, color: "#fff" }
                    : { borderColor: `${f.color}55`, color: f.color, backgroundColor: `${f.color}14` }
                }
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setPollMode((v) => !v)}
            className={cx(
              "mt-2.5 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition",
              pollMode
                ? "border-[var(--accent)] bg-[var(--accent-soft)] text-zinc-100"
                : "border-zinc-800 text-zinc-400 hover:text-zinc-200",
            )}
          >
            <Vote size={12} /> {pollMode ? "Poll enabled" : "Add a quick poll"}
          </button>

          {pollMode ? (
            <div className="mt-2.5 space-y-2">
              {options.map((opt, i) => (
                <input
                  key={i}
                  value={opt}
                  onChange={(e) => setOptions((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
                  placeholder={`Poll option ${i + 1}`}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)]"
                />
              ))}
              {options.length < 4 ? (
                <button
                  type="button"
                  onClick={() => setOptions((prev) => [...prev, ""])}
                  className="text-[11px] font-semibold text-[var(--accent-2)] hover:underline"
                >
                  + Add option
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500">
              {text.length}/500 · <span className="font-semibold" style={{ color: flair.color }}>{flair.label}</span>
            </span>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={!text.trim() || busy}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-grad)] px-4 py-1.5 text-xs font-bold text-white transition hover:brightness-110 active:scale-95 disabled:opacity-40"
            >
              <Sparkles size={13} /> {busy ? "Posting..." : "Post"}
            </button>
          </div>
          {settings.toxicFilter ? (
            <p className="mt-2 text-[10px] text-zinc-600">Safe-chat filter is on — unkind words get softened.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ChatPostCard({ post }: { post: Post }) {
  const { user, toast, apiError, savedIds, toggleSaved, settings } = useCliq();
  const [vote, setVote] = useState<"up" | "down" | null>(
    post.myReaction === "upgrade" ? "up" : post.myReaction === "downgrade" ? "down" : null,
  );
  const [upgrades, setUpgrades] = useState(post.upgradesCount);
  const [downgrades, setDowngrades] = useState(post.downgradesCount);
  const [poll, setPoll] = useState(post.poll);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [draft, setDraft] = useState("");

  const { comments, loading, add } = useComments(post.id, commentsOpen);
  const saved = savedIds.includes(post.id);
  const mine = post.userId === user?.id;
  const hideCounts = settings.hideDislikes && mine;
  const score = upgrades - downgrades;
  const pollTotal = poll ? poll.options.reduce((sum, o) => sum + o.votes, 0) : 0;

  async function applyVote(dir: "up" | "down") {
    try {
      const { post: updated } = await api.react(post.id, dir === "up" ? "upgrade" : "downgrade");
      setVote(updated.myReaction === "upgrade" ? "up" : updated.myReaction === "downgrade" ? "down" : null);
      setUpgrades(updated.upgradesCount);
      setDowngrades(updated.downgradesCount);
    } catch (error) {
      apiError(error);
    }
  }

  async function castPoll(optionId: string) {
    try {
      const { post: updated } = await api.votePoll(post.id, optionId);
      setPoll(updated.poll);
    } catch (error) {
      apiError(error);
    }
  }

  return (
    <article className="cliq-rise rounded-3xl border border-zinc-800/80 bg-zinc-900/80 p-4 backdrop-blur-md">
      <header className="flex items-center gap-3">
        {post.author ? <Avatar user={post.author} size={40} ring /> : <span className="h-10 w-10 rounded-full bg-zinc-800" />}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-100">{post.author?.displayName ?? "Cliq User"}</p>
          <p className="truncate text-[11px] text-zinc-500">
            @{post.author?.username ?? "unknown"} · {timeAgo(post.createdAt)}
          </p>
        </div>
        {post.flair ? (
          <span
            className="shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold"
            style={{
              borderColor: `${flairColor(post.flair)}66`,
              color: flairColor(post.flair),
              backgroundColor: `${flairColor(post.flair)}18`,
            }}
          >
            {post.flair}
          </span>
        ) : null}
      </header>

      <p className="mt-3 text-sm leading-relaxed text-zinc-100">
        <HashtagText text={censor(post.content, settings.toxicFilter)} />
      </p>

      {poll ? (
        <div className="mt-3 space-y-2">
          {poll.options.map((opt) => {
            const pct = pollTotal > 0 ? Math.round((opt.votes / pollTotal) * 100) : 0;
            const voted = poll.votedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => void castPoll(opt.id)}
                className={cx(
                  "relative w-full overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition",
                  voted ? "border-[var(--accent)]" : "border-zinc-800 hover:border-zinc-700",
                )}
              >
                <span
                  className="absolute inset-y-0 left-0 bg-[var(--accent-soft)] transition-[width] duration-500"
                  style={{ width: `${pct}%` }}
                />
                <span className="relative flex items-center justify-between text-xs font-semibold text-zinc-100">
                  <span>{opt.text}</span>
                  <span className="tabular-nums text-zinc-300">
                    {pct}%{voted ? " ✓" : ""}
                  </span>
                </span>
              </button>
            );
          })}
          <p className="text-[11px] text-zinc-500">
            {pollTotal} vote{pollTotal === 1 ? "" : "s"} · {poll.votedOptionId ? "You voted" : "Tap to vote"}
          </p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <VoteBar
          score={hideCounts ? 0 : score}
          vote={vote}
          onUp={() => void applyVote("up")}
          onDown={() => void applyVote("down")}
        />
        <IconButton
          icon={<MessageCircle size={17} />}
          count={commentsOpen ? comments.length : post.commentCount}
          onClick={() => setCommentsOpen((v) => !v)}
          title="Comments"
        />
        <IconButton icon={<Repeat size={17} />} count={formatCount(0)} disabled title="Reposts (coming soon)" />
        <IconButton
          icon={<Bookmark size={17} className={cx(saved && "fill-current")} />}
          active={saved}
          onClick={() => {
            toggleSaved(post.id);
            toast(saved ? "Removed from Saved" : "Post saved 🔖", saved ? "default" : "success");
          }}
          title="Save"
        />
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="ml-auto rounded-full p-2 text-zinc-400 transition hover:bg-zinc-800/70 hover:text-zinc-100"
          aria-label="Share post"
        >
          <Share2 size={17} />
        </button>
      </div>

      {commentsOpen ? (
        <div className="mt-3 rounded-2xl border border-zinc-800/70 bg-zinc-950/50 p-3">
          <CommentThread
            comments={comments}
            loading={loading}
            onReply={(parentId, text) => add(text, parentId)}
            canInteract={Boolean(user)}
            toxicFilter={settings.toxicFilter}
          />
          <div className="mt-3 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && draft.trim()) {
                  void add(draft);
                  setDraft("");
                }
              }}
              placeholder="Join the thread..."
              className="min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-100 outline-none focus:border-[var(--accent)]"
            />
            <button
              type="button"
              onClick={() => {
                if (draft.trim()) {
                  void add(draft);
                  setDraft("");
                }
              }}
              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--accent-grad)] text-white"
              aria-label="Send comment"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      ) : null}

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        title={`@${post.author?.username ?? "unknown"}'s post`}
      />
    </article>
  );
}
