"use client";

import { useState } from "react";
import { Film, Image as ImageIcon, Link2, MessageSquare, Sparkles, X } from "lucide-react";
import { useCliq } from "@/components/CliqProvider";
import { Modal } from "@/components/ui/Primitives";
import { FLAIRS } from "@/lib/constants";
import { api } from "@/lib/api-client";
import type { PostType } from "@/types/cliq";
import { cx } from "@/lib/utils";

export function CreateModal() {
  const { createOpen, setCreateOpen, tab, bump, toast, apiError } = useCliq();
  const [type, setType] = useState<PostType>("video");
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [flair, setFlair] = useState(FLAIRS[0].label);
  const [pollMode, setPollMode] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);

  function close() {
    setCreateOpen(false);
    setContent("");
    setMediaUrl("");
    setPollMode(false);
    setPollOptions(["", ""]);
  }

  function openWith(defaultType: PostType) {
    setType(defaultType);
  }

  const typeForTab: PostType | null =
    tab === "videos" ? "video" : tab === "photos" ? "photo" : tab === "chatposts" ? "chat" : null;

  const canPublish =
    type === "chat" ? content.trim().length > 0 : content.trim().length > 0 || mediaUrl.trim().length > 0;

  async function publish() {
    if (!canPublish || busy) return;
    setBusy(true);
    try {
      await api.createPost({
        type,
        content: content.trim(),
        mediaUrl: mediaUrl.trim() || null,
        flair: type === "chat" ? flair : null,
        pollOptions: type === "chat" && pollMode ? pollOptions.filter((o) => o.trim()) : [],
      });
      bump();
      toast("Published to Cliq ⚡", "success");
      close();
    } catch (error) {
      apiError(error);
    } finally {
      setBusy(false);
    }
  }

  const tabs: { key: PostType; label: string; icon: typeof Film }[] = [
    { key: "video", label: "Video", icon: Film },
    { key: "photo", label: "Photo", icon: ImageIcon },
    { key: "chat", label: "Chat Post", icon: MessageSquare },
  ];

  return (
    <Modal
      open={createOpen}
      onClose={close}
      title="Create on Cliq"
      subtitle="Share a video, a photo, or a late-night thought ✨"
      maxWidth="max-w-xl"
    >
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-1">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => openWith(key)}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition",
              type === key ? "bg-[var(--accent-grad)] text-white" : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {typeForTab && typeForTab !== type ? (
        <p className="mb-3 rounded-xl border border-zinc-800 bg-zinc-950/50 px-3 py-2 text-[11px] text-zinc-400">
          You&apos;re on the {tab === "videos" ? "Videos" : tab === "photos" ? "Photos" : "Chat Posts"} tab — this
          will post there.
        </p>
      ) : null}

      <div className="space-y-4">
        {type !== "chat" ? (
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-400">
              {type === "video" ? <Film size={13} /> : <ImageIcon size={13} />}
              {type === "video" ? "Video URL (.mp4)" : "Photo URL"}
              <span className="text-zinc-600">— paste a link or upload a file</span>
            </span>
            <input
              value={mediaUrl.startsWith("data:") ? "" : mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder={type === "video" ? "https://.../clip.mp4" : "https://.../photo.jpg"}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
            />
            <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-[var(--accent)] hover:text-zinc-100">
              <Link2 size={13} /> Upload {type === "video" ? "video" : "image"}
              <input
                type="file"
                accept={type === "video" ? "video/*" : "image/*"}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 4.5 * 1024 * 1024) {
                    toast("Keep uploads under 4.5MB, or paste a URL instead.", "danger");
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => setMediaUrl(typeof reader.result === "string" ? reader.result : "");
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          </label>
        ) : null}

        {type === "chat" ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">Topic flair</p>
            <div className="flex flex-wrap gap-2">
              {FLAIRS.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={() => setFlair(f.label)}
                  className="rounded-full border px-3 py-1 text-xs font-semibold transition"
                  style={
                    flair === f.label
                      ? { background: f.color, borderColor: f.color, color: "#fff" }
                      : { borderColor: `${f.color}66`, color: f.color, backgroundColor: `${f.color}18` }
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
                "mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition",
                pollMode
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-zinc-100"
                  : "border-zinc-800 text-zinc-400 hover:text-zinc-200",
              )}
            >
              <Sparkles size={12} /> {pollMode ? "Poll added" : "Add a quick poll"}
            </button>
            {pollMode ? (
              <div className="mt-3 space-y-2">
                {pollOptions.map((opt, i) => (
                  <input
                    key={i}
                    value={opt}
                    onChange={(e) => setPollOptions((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))}
                    placeholder={`Option ${i + 1}`}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
                  />
                ))}
                {pollOptions.length < 4 ? (
                  <button
                    type="button"
                    onClick={() => setPollOptions((prev) => [...prev, ""])}
                    className="text-xs font-semibold text-[var(--accent-2)] hover:underline"
                  >
                    + Add option
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder={
            type === "chat"
              ? "Drop a thought on Cliq..."
              : type === "video"
                ? "Write a caption for your video... #hashtags welcome"
                : "Write a caption for your photo... #hashtags welcome"
          }
          className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
        />
        <div className="flex items-center justify-between text-[11px] text-zinc-500">
          <span>{content.length}/500 characters</span>
          <span>Safe-chat filter keeps Cliq kind 🛡️</span>
        </div>

        <button
          type="button"
          onClick={publish}
          disabled={!canPublish || busy}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-grad)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Publishing..." : "Publish to Cliq"}
        </button>
      </div>
    </Modal>
  );
}

export function ShareSheet({
  open,
  onClose,
  title,
  onShare,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onShare?: (action: "copy" | "repost") => void;
}) {
  const { toast } = useCliq();
  const [copied, setCopied] = useState(false);

  const actions = [
    {
      key: "copy",
      label: copied ? "Link copied ✓" : "Copy Link",
      icon: Link2,
      run: () => {
        const url = typeof window !== "undefined" ? window.location.href : "https://oncliq.vercel.app";
        navigator.clipboard?.writeText(url).catch(() => undefined);
        setCopied(true);
        onShare?.("copy");
        toast("Link copied to clipboard 🔗", "success");
      },
    },
    {
      key: "repost",
      label: "Repost to my Cliq",
      icon: Sparkles,
      run: () => {
        onShare?.("repost");
        toast("Reposted 🔁", "success");
      },
    },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Share" subtitle={title} maxWidth="max-w-md">
      <div className="space-y-1.5">
        {actions.map(({ key, label, icon: Icon, run }) => (
          <button
            key={key}
            type="button"
            onClick={run}
            className="flex w-full items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-[var(--accent)] hover:bg-zinc-900"
          >
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-semibold text-zinc-500 transition hover:text-zinc-200"
      >
        <X size={14} /> Cancel
      </button>
    </Modal>
  );
}
