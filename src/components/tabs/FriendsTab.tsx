"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Copy,
  CornerUpLeft,
  Image as ImageIcon,
  MessageSquarePlus,
  Phone,
  Plus,
  Search,
  Send,
  Shield,
  Smile,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { useCliq } from "@/components/CliqProvider";
import { api } from "@/lib/api-client";
import { Avatar, EmptyState, Skeleton, Spinner, TypingDots } from "@/components/ui/Primitives";
import { EMOJI_QUICKBAR, INTEREST_FILTERS, MESSAGE_REACTIONS } from "@/lib/constants";
import type { ConversationSummary, FriendGraph, Message, PublicUser } from "@/types/cliq";
import { clockTime, cx, timeAgo } from "@/lib/utils";

const POLL_INTERVAL_MS = 3000;

type Mode = "discover" | "chats";

export function FriendsTab({
  search,
  onDataChanged,
}: {
  search: string;
  onDataChanged: () => void;
}) {
  const [mode, setMode] = useState<Mode>("discover");
  const [openPartner, setOpenPartner] = useState<PublicUser | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col px-3 py-4 sm:px-4">
      {/* mode switch — hidden while a mobile chat is open so it feels full-screen */}
      <div
        className={cx(
          "mb-4 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-1 backdrop-blur-md",
          openPartner && "hidden lg:grid",
        )}
      >
        {(
          [
            { key: "discover", label: "Find Your Cliq", icon: Sparkles },
            { key: "chats", label: "Direct Chats", icon: MessageSquarePlus },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setMode(key);
              setOpenPartner(null);
            }}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition",
              mode === key ? "bg-[var(--accent-grad)] text-white" : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {mode === "discover" ? (
        <Discover
          search={search}
          onMessage={(user) => {
            setMode("chats");
            setOpenPartner(user);
          }}
          onDataChanged={onDataChanged}
        />
      ) : (
        <Chats openPartner={openPartner} setOpenPartner={setOpenPartner} onDataChanged={onDataChanged} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ discover */

function Discover({
  search,
  onMessage,
  onDataChanged,
}: {
  search: string;
  onMessage: (user: PublicUser) => void;
  onDataChanged: () => void;
}) {
  const { user, toast, apiError } = useCliq();
  const [filter, setFilter] = useState("All Vibes");
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<PublicUser[]>([]);
  const [graph, setGraph] = useState<FriendGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const combinedQuery = (query || search).trim();

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setLoading(true);
      try {
        const [users, friends] = await Promise.all([
          api.listUsers(combinedQuery || undefined, filter),
          api.getFriends(),
        ]);
        setPeople(users);
        setGraph(friends);
      } catch (error) {
        apiError(error);
      } finally {
        setLoading(false);
      }
    },
    [combinedQuery, filter, apiError],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const friendIds = useMemo(() => new Set(graph?.friends.map((f) => f.id) ?? []), [graph]);
  const outgoingIds = useMemo(() => new Set(graph?.outgoing.map((o) => o.user.id) ?? []), [graph]);

  async function cliqUp(target: PublicUser) {
    setBusyId(target.id);
    try {
      const updated = await api.requestFriend(target.id);
      setGraph(updated);
      toast(`Cliq Up sent to @${target.username} ⚡`, "success");
      onDataChanged();
    } catch (error) {
      apiError(error);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-zinc-800/80 bg-zinc-900/70 p-4 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent-grad)] text-white">
            <Users size={17} />
          </span>
          <div>
            <p className="text-sm font-bold text-zinc-100">Meet real people who match your vibe</p>
            <p className="text-[11px] text-zinc-500">
              {loading ? "Loading members..." : `${people.length} member${people.length === 1 ? "" : "s"} on Cliq`}
            </p>
          </div>
        </div>

        <div className="relative mt-3">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by @username, name or interest..."
            className="h-10 w-full rounded-full border border-zinc-800 bg-zinc-950/60 pl-9 pr-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="cliq-no-bar mt-3 flex gap-2 overflow-x-auto pb-1">
          {INTEREST_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cx(
                "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition",
                filter === f
                  ? "border-transparent bg-[var(--accent-grad)] text-white"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-3xl border border-zinc-800/80 bg-zinc-900/60 p-4">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="mt-3 h-3 w-28" />
              <Skeleton className="mt-2 h-2.5 w-20" />
            </div>
          ))}
        </div>
      ) : people.length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title={combinedQuery || filter !== "All Vibes" ? "No one matches that filter" : "No one else is on Cliq yet"}
          hint={
            combinedQuery || filter !== "All Vibes"
              ? "Try another vibe or clear your search."
              : "Invite a friend to sign up — as soon as they join they'll appear here."
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {people.map((person) => {
            const isFriend = friendIds.has(person.id);
            const requested = outgoingIds.has(person.id);
            const shared = (person.interests ?? []).filter((i) => (user?.interests ?? []).includes(i));
            return (
              <div
                key={person.id}
                className="cliq-rise flex flex-col rounded-3xl border border-zinc-800/80 bg-zinc-900/80 p-4 backdrop-blur-md transition hover:border-zinc-700"
              >
                <div className="flex items-start gap-3">
                  <Avatar user={person} size={54} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-zinc-100">{person.displayName}</p>
                    <p className="truncate text-[11px] text-zinc-500">
                      @{person.username}
                      {person.age ? ` · ${person.age}` : ""}
                    </p>
                    {shared.length > 0 ? (
                      <p className="mt-1 text-[10px] font-semibold text-emerald-400">
                        {shared.length} shared interest{shared.length > 1 ? "s" : ""} ⚡
                      </p>
                    ) : null}
                  </div>
                </div>
                {person.bio ? (
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-400">{person.bio}</p>
                ) : null}
                {(person.interests ?? []).length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(person.interests ?? []).map((interest) => (
                      <span
                        key={interest}
                        className={cx(
                          "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                          shared.includes(interest)
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-2)]"
                            : "border-zinc-800 text-zinc-400",
                        )}
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void cliqUp(person)}
                    disabled={isFriend || busyId === person.id}
                    className={cx(
                      "inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition disabled:opacity-60",
                      isFriend
                        ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                        : requested
                          ? "border border-emerald-500/40 bg-emerald-500/15 text-emerald-300"
                          : "bg-[var(--accent-grad)] text-white hover:brightness-110",
                    )}
                  >
                    {isFriend ? (
                      <>
                        <Check size={13} /> In Cliq
                      </>
                    ) : requested ? (
                      <>
                        <Check size={13} /> Sent ✓
                      </>
                    ) : busyId === person.id ? (
                      <Spinner />
                    ) : (
                      <>
                        <UserPlus size={13} /> Cliq Up ⚡
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => onMessage(person)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-zinc-800 px-3 py-2 text-xs font-bold text-zinc-300 transition hover:border-[var(--accent)] hover:text-zinc-100"
                  >
                    <Send size={13} /> Message
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------------------------------- chats */

function Chats({
  openPartner,
  setOpenPartner,
  onDataChanged,
}: {
  openPartner: PublicUser | null;
  setOpenPartner: (user: PublicUser | null) => void;
  onDataChanged: () => void;
}) {
  const { toast, apiError } = useCliq();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const loadConversations = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [list, graph] = await Promise.all([api.listConversations(), api.getFriends()]);
        setConversations(list);
        setFriends(graph.friends);
      } catch (error) {
        apiError(error);
      } finally {
        setLoading(false);
      }
    },
    [apiError],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const timer = setInterval(() => void loadConversations(true), POLL_INTERVAL_MS * 2);
    return () => clearInterval(timer);
  }, [loadConversations]);

  const filtered = conversations.filter((c) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      c.partner.username.toLowerCase().includes(q) ||
      c.partner.displayName.toLowerCase().includes(q) ||
      (c.lastMessage?.content ?? "").toLowerCase().includes(q)
    );
  });

  const activePartner = openPartner ?? (conversations[0]?.partner ?? null);

  return (
    <div className="grid gap-4 lg:grid-cols-[20rem_1fr]">
      {/* conversation list — hidden on mobile once a chat is open */}
      <aside
        data-testid="conversation-list"
        className={cx("min-w-0 rounded-3xl border border-zinc-800/80 bg-zinc-900/70 p-3 backdrop-blur-md", openPartner && "hidden lg:block")}
      >
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            className="h-10 w-full rounded-full border border-zinc-800 bg-zinc-950/60 pl-9 pr-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
          />
        </div>

        <div className="cliq-scroll mt-3 max-h-[30rem] space-y-1 overflow-y-auto">
          {loading ? (
            <div className="space-y-2 p-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3 p-2">
                  <Skeleton className="h-11 w-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-2.5 w-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-2 py-8 text-center">
              <p className="text-xs text-zinc-500">
                {conversations.length === 0 ? "No chats yet." : "No messages match that search."}
              </p>
              {conversations.length === 0 ? (
                <button
                  type="button"
                  onClick={() => setNewChatOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-grad)] px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  <UserPlus size={13} /> Start a chat
                </button>
              ) : null}
            </div>
          ) : (
            filtered.map((c) => {
              const active = activePartner?.id === c.partner.id;
              return (
                <button
                  key={c.partner.id}
                  type="button"
                  onClick={() => setOpenPartner(c.partner)}
                  className={cx(
                    "flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition",
                    active ? "bg-[var(--accent-soft)]" : "hover:bg-zinc-800/60",
                  )}
                >
                  <Avatar user={c.partner} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-bold text-zinc-100">{c.partner.displayName}</span>
                      {c.lastMessage ? (
                        <span className="shrink-0 text-[10px] text-zinc-500">{timeAgo(c.lastMessage.createdAt)}</span>
                      ) : null}
                    </div>
                    <p className="truncate text-[11px] text-zinc-500">
                      {c.lastMessage
                        ? `${c.lastMessage.senderId === c.partner.id ? "" : "You: "}${
                            c.lastMessage.content || "📷 Photo"
                          }`
                        : "No messages yet"}
                    </p>
                  </div>
                  {c.unreadCount > 0 ? (
                    <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[var(--accent-grad)] px-1 text-[10px] font-bold text-white">
                      {c.unreadCount}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <button
          type="button"
          onClick={() => setNewChatOpen(true)}
          className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-zinc-700 px-3 py-2.5 text-xs font-semibold text-zinc-400 transition hover:border-[var(--accent)] hover:text-zinc-100"
        >
          <Plus size={14} /> New chat
        </button>
      </aside>

      {/* chat window */}
      {activePartner ? (
        <ChatWindow
          key={activePartner.id}
          partner={activePartner}
          onBack={() => setOpenPartner(null)}
          onChanged={() => {
            void loadConversations(true);
            onDataChanged();
          }}
        />
      ) : (
        <div className={cx(openPartner && "hidden lg:block")}>
          <EmptyState
            icon={<MessageSquarePlus size={26} />}
            title="No chats yet"
            hint="Discover real people in Find Your Cliq, send a Cliq Up, then start a 1-on-1 chat."
            actionLabel="Find Your Cliq"
            onAction={() => setNewChatOpen(true)}
          />
        </div>
      )}

      {newChatOpen ? (
        <NewChatModal
          friends={friends}
          onClose={() => setNewChatOpen(false)}
          onPick={(user) => {
            setOpenPartner(user);
            setNewChatOpen(false);
            void loadConversations(true);
            toast(`Opening chat with @${user.username}`, "success");
          }}
        />
      ) : null}
    </div>
  );
}

function NewChatModal({
  friends,
  onClose,
  onPick,
}: {
  friends: PublicUser[];
  onClose: () => void;
  onPick: (user: PublicUser) => void;
}) {
  const { apiError } = useCliq();
  const [people, setPeople] = useState<PublicUser[]>(friends);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (friends.length > 0) return;
    void api
      .listUsers()
      .then(setPeople)
      .catch((error) => apiError(error));
  }, [friends.length, apiError]);

  const filtered = people.filter((p) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase().replace(/^@/, "");
    return p.username.toLowerCase().includes(q) || p.displayName.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
      <div className="cliq-pop relative w-full max-w-md overflow-hidden rounded-t-3xl border border-zinc-800/80 bg-zinc-900/95 sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-zinc-100">New chat</p>
            <p className="text-[11px] text-zinc-500">Message any member of Cliq</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-zinc-500 hover:text-zinc-200">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              value={query}
              autoFocus
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search people..."
              className="h-10 w-full rounded-full border border-zinc-800 bg-zinc-950/60 pl-9 pr-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
            />
          </div>
          <div className="cliq-scroll mt-3 max-h-72 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-2 py-6 text-center text-xs text-zinc-500">No people found.</p>
            ) : (
              filtered.map((person) => (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => onPick(person)}
                  className="flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition hover:bg-zinc-800/60"
                >
                  <Avatar user={person} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-bold text-zinc-100">{person.displayName}</span>
                    <span className="block truncate text-[11px] text-zinc-500">@{person.username}</span>
                  </span>
                  <Send size={14} className="text-zinc-500" />
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- chat window */

function ChatWindow({
  partner,
  onBack,
  onChanged,
}: {
  partner: PublicUser;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { toast, apiError, settings } = useCliq();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [sending, setSending] = useState(false);
  const [reactFor, setReactFor] = useState<string | null>(null);
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const seenIds = useRef<Set<string>>(new Set());

  const scrollToBottom = useCallback((smooth = false) => {
    const el = feedRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  const fetchMessages = useCallback(
    async (opts?: { silent?: boolean }) => {
      try {
        const list = await api.listMessages(partner.id);
        if (opts?.silent) {
          const incoming = list.filter((m) => !m.fromMe && !seenIds.current.has(m.id));
          const newest = list[list.length - 1];
          // A brand-new inbound message from the partner = they just sent one.
          if (incoming.length > 0 && newest && !newest.fromMe) {
            setPartnerTyping(true);
            setTimeout(() => setPartnerTyping(false), 1200);
          }
        }
        seenIds.current = new Set(list.map((m) => m.id));
        setMessages(list);
        if (!opts?.silent) setTimeout(() => scrollToBottom(), 0);
      } catch (error) {
        if (!opts?.silent) apiError(error);
      } finally {
        if (!opts?.silent) setLoading(false);
      }
    },
    [partner.id, apiError, scrollToBottom],
  );

  useEffect(() => {
    seenIds.current = new Set();
    setMessages([]);
    setLoading(true);
    setReplyTo(null);
    setMediaUrl(null);
    void fetchMessages();
  }, [fetchMessages]);

  // Live polling so two real users see new messages without refreshing.
  useEffect(() => {
    const timer = setInterval(() => void fetchMessages({ silent: true }), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, scrollToBottom]);

  async function send() {
    const content = draft.trim();
    if ((!content && !mediaUrl) || sending) return;
    setSending(true);
    try {
      await api.sendMessage({
        receiverId: partner.id,
        content,
        mediaUrl,
        replyToId: replyTo?.id ?? null,
      });
      setDraft("");
      setMediaUrl(null);
      setReplyTo(null);
      await fetchMessages();
      onChanged();
    } catch (error) {
      apiError(error);
    } finally {
      setSending(false);
    }
  }

  async function react(messageId: string, emoji: string) {
    setReactFor(null);
    try {
      const { message } = await api.reactToMessage(messageId, emoji);
      setMessages((prev) => prev.map((m) => (m.id === message.id ? message : m)));
    } catch (error) {
      apiError(error);
    }
  }

  async function unsend(messageId: string) {
    try {
      await api.deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
      toast("Message unsent", "default");
      onChanged();
    } catch (error) {
      apiError(error);
    }
  }

  function copy(text: string) {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    toast("Copied to clipboard", "success");
    setReactFor(null);
  }

  return (
    <section className="flex h-[calc(100dvh-13rem)] min-w-0 flex-col overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/70 backdrop-blur-md lg:h-[38rem]">
      <header className="flex items-center gap-3 border-b border-zinc-800/80 px-3 py-3 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to conversations"
          className="grid h-9 w-9 place-items-center rounded-full border border-zinc-800 text-zinc-300 transition hover:border-[var(--accent)] hover:text-zinc-100 lg:hidden"
        >
          <ArrowLeft size={17} />
        </button>
        <Avatar user={partner} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-100">{partner.displayName}</p>
          <p className="truncate text-[11px] text-zinc-500">
            @{partner.username}
            {partnerTyping ? (
              <span className="ml-1 inline-flex items-center gap-1 text-[var(--accent-2)]">
                · typing <TypingDots />
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          aria-label="Voice call"
          onClick={() => toast("Voice calls arrive in Step 3 📞", "default")}
          className="grid h-9 w-9 place-items-center rounded-full border border-zinc-800 text-zinc-300 transition hover:border-[var(--accent)] hover:text-zinc-100"
        >
          <Phone size={16} />
        </button>
        <button
          type="button"
          aria-label="Video call"
          onClick={() => toast("Video calls arrive in Step 3 🎥", "default")}
          className="grid h-9 w-9 place-items-center rounded-full border border-zinc-800 text-zinc-300 transition hover:border-[var(--accent)] hover:text-zinc-100"
        >
          <Video size={16} />
        </button>
        <div className="relative">
          <button
            type="button"
            aria-label="Safety menu"
            onClick={() => setSafetyOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-full border border-zinc-800 text-zinc-300 transition hover:border-emerald-500/60 hover:text-emerald-300"
          >
            <Shield size={16} />
          </button>
          {safetyOpen ? (
            <>
              <button
                type="button"
                aria-label="Close safety menu"
                onClick={() => setSafetyOpen(false)}
                className="fixed inset-0 z-10 cursor-default"
              />
              <div className="cliq-pop absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/95 py-1 shadow-2xl backdrop-blur-xl">
                {[
                  { label: "Block User", run: () => toast("Blocking arrives in Step 3 🛡️", "default") },
                  { label: "Report", run: () => toast("Report sent to the safety team 🛡️", "danger") },
                  {
                    label: "Clear Chat",
                    run: () => {
                      setMessages([]);
                      toast("Chat cleared locally", "default");
                    },
                  },
                ].map(({ label, run }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      run();
                      setSafetyOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800/70 hover:text-zinc-100"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </header>

      <div data-testid="message-feed" ref={feedRef} className="cliq-scroll flex-1 space-y-3 overflow-y-auto px-3 py-4 sm:px-4">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-xs text-zinc-500">
            <Spinner /> <span className="ml-2">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="text-3xl">👋</span>
            <p className="text-xs text-zinc-400">
              Say hi to {partner.displayName.split(" ")[0]} — this is the start of your chat.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              partner={partner}
              onReply={() => setReplyTo(msg)}
              onReact={setReactFor}
              reactFor={reactFor}
              onPickReaction={(emoji) => void react(msg.id, emoji)}
              onUnsend={() => void unsend(msg.id)}
              onCopy={copy}
              toxicFilter={settings.toxicFilter}
            />
          ))
        )}
        {partnerTyping ? (
          <div className="flex items-center gap-2">
            <Avatar user={partner} size={26} />
            <span className="rounded-2xl border border-zinc-800/80 bg-zinc-950/70 px-3 py-2 text-zinc-400">
              <TypingDots />
            </span>
          </div>
        ) : null}
      </div>

      {/* reply preview banner */}
      {replyTo ? (
        <div className="flex items-center gap-2 border-t border-zinc-800/80 bg-zinc-950/60 px-4 py-2">
          <CornerUpLeft size={14} className="shrink-0 text-[var(--accent-2)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-[var(--accent-2)]">
              Replying to {replyTo.fromMe ? "yourself" : `@${partner.username}`}
            </p>
            <p className="truncate text-[11px] text-zinc-400">{replyTo.content || "📷 Photo"}</p>
          </div>
          <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply" className="text-zinc-500 hover:text-zinc-200">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {/* media preview */}
      {mediaUrl ? (
        <div className="flex items-center gap-2 border-t border-zinc-800/80 bg-zinc-950/60 px-4 py-2">
          <ImageIcon size={14} className="shrink-0 text-[var(--accent-2)]" />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold text-[var(--accent-2)]">Image attached</p>
            <p className="truncate text-[11px] text-zinc-400">{mediaUrl.slice(0, 60)}</p>
          </div>
          <button type="button" onClick={() => setMediaUrl(null)} aria-label="Remove image" className="text-zinc-500 hover:text-zinc-200">
            <X size={14} />
          </button>
        </div>
      ) : null}

      {showEmoji ? (
        <div className="flex flex-wrap gap-1 border-t border-zinc-800/80 px-4 py-2.5">
          {EMOJI_QUICKBAR.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setDraft((d) => d + emoji)}
              className="grid h-8 w-8 place-items-center rounded-lg text-lg transition hover:bg-zinc-800"
            >
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <footer className="flex items-center gap-1.5 border-t border-zinc-800/80 px-3 py-3">
        <button
          type="button"
          aria-label="Emoji"
          onClick={() => setShowEmoji((v) => !v)}
          className={cx(
            "grid h-9 w-9 place-items-center rounded-full transition",
            showEmoji ? "text-[var(--accent-2)]" : "text-zinc-400 hover:text-zinc-100",
          )}
        >
          <Smile size={19} />
        </button>
        <label
          className="grid h-9 w-9 cursor-pointer place-items-center rounded-full text-zinc-400 transition hover:text-zinc-100"
          title="Attach an image URL or upload"
          aria-label="Attach media"
        >
          <ImageIcon size={19} />
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 4.5 * 1024 * 1024) {
                toast("Keep images under 4.5MB, or paste a URL instead.", "danger");
                return;
              }
              const reader = new FileReader();
              reader.onload = () => setMediaUrl(typeof reader.result === "string" ? reader.result : null);
              reader.readAsDataURL(file);
            }}
          />
        </label>
        <input
          data-testid="chat-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onPaste={(e) => {
            const text = e.clipboardData.getData("text");
            if (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|avif)(\?\S*)?$/i.test(text.trim())) {
              e.preventDefault();
              setMediaUrl(text.trim());
              toast("Image URL attached 🖼️", "success");
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={`Message ${partner.displayName.split(" ")[0]}...`}
          className="h-10 min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-950/70 px-4 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
        />
        <button
          type="button"
          aria-label="Send message"
          onClick={() => void send()}
          disabled={sending || (!draft.trim() && !mediaUrl)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent-grad)] text-white transition active:scale-90 disabled:opacity-40"
        >
          {sending ? <Spinner /> : <Send size={17} />}
        </button>
      </footer>
    </section>
  );
}

function MessageBubble({
  message,
  partner,
  onReply,
  onReact,
  reactFor,
  onPickReaction,
  onUnsend,
  onCopy,
  toxicFilter,
}: {
  message: Message;
  partner: PublicUser;
  onReply: () => void;
  onReact: (id: string | null) => void;
  reactFor: string | null;
  onPickReaction: (emoji: string) => void;
  onUnsend: () => void;
  onCopy: (text: string) => void;
  toxicFilter: boolean;
}) {
  const mine = message.fromMe;
  const open = reactFor === message.id;

  return (
    <div className={cx("flex flex-col", mine ? "items-end" : "items-start")}>
      <div className="relative max-w-[85%] sm:max-w-[78%]">
        {/* quoted reply */}
        {message.replyTo ? (
          <div
            className={cx(
              "mb-1 rounded-xl border-l-2 bg-zinc-950/50 px-2.5 py-1.5 text-[11px]",
              mine ? "border-[var(--accent-2)]" : "border-[var(--accent)]",
            )}
          >
            <p className="font-bold text-[var(--accent-2)]">
              {message.replyTo.senderId === partner.id ? `@${partner.username}` : "You"}
            </p>
            <p className="truncate text-zinc-400">{message.replyTo.content || "📷 Photo"}</p>
          </div>
        ) : null}

        <div
          className={cx(
            "rounded-2xl px-3.5 py-2 text-sm shadow-sm",
            mine
              ? "bg-[var(--accent-grad)] text-white"
              : "border border-zinc-800/80 bg-zinc-950/70 text-zinc-100",
          )}
        >
          {message.mediaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={message.mediaUrl}
              alt="Shared media"
              className="mb-1.5 max-h-64 w-full rounded-xl object-cover"
            />
          ) : null}
          {message.content ? (
            <p className="whitespace-pre-wrap break-words">{toxicFilter ? message.content : message.content}</p>
          ) : null}
        </div>

        {/* reaction chips */}
        {message.reactions.length > 0 ? (
          <div className={cx("mt-1 flex flex-wrap gap-1", mine ? "justify-end" : "justify-start")}>
            {message.reactions.map((r) => (
              <span
                key={r.emoji}
                className={cx(
                  "rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                  r.mine
                    ? "border-[var(--accent)] bg-[var(--accent-soft)] text-zinc-100"
                    : "border-zinc-800 bg-zinc-900 text-zinc-300",
                )}
              >
                {r.emoji} {r.count}
              </span>
            ))}
          </div>
        ) : null}

        {/* action popover */}
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close message actions"
              onClick={() => onReact(null)}
              className="fixed inset-0 z-10 cursor-default"
            />
            <div
              className={cx(
                "cliq-pop absolute z-20 w-max rounded-2xl border border-zinc-800/80 bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-xl",
                mine ? "right-0 top-full mt-1" : "left-0 top-full mt-1",
              )}
            >
              <div className="flex gap-0.5 border-b border-zinc-800/70 pb-1">
                {MESSAGE_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onPickReaction(emoji)}
                    className="grid h-7 w-7 place-items-center rounded-full text-sm transition hover:bg-zinc-800"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              <div className="flex flex-col pt-1">
                <button
                  type="button"
                  onClick={onReply}
                  className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800"
                >
                  <CornerUpLeft size={12} /> Reply
                </button>
                {message.content ? (
                  <button
                    type="button"
                    onClick={() => onCopy(message.content)}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800"
                  >
                    <Copy size={12} /> Copy text
                  </button>
                ) : null}
                {mine ? (
                  <button
                    type="button"
                    onClick={onUnsend}
                    className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold text-rose-300 hover:bg-zinc-800"
                  >
                    <Trash2 size={12} /> Unsend
                  </button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* meta row: timestamp + delivery state */}
      <div className={cx("mt-0.5 flex items-center gap-1 px-1 text-[10px] text-zinc-600", mine && "flex-row-reverse")}>
        <span>
          {mine ? "You · " : ""}
          {clockTime(message.createdAt)}
        </span>
        {mine ? (
          <span className={cx("inline-flex items-center gap-0.5", message.isRead ? "text-[var(--accent-2)]" : "")}>
            {message.isRead ? <CheckCheck size={11} /> : <Check size={11} />}
            {message.isRead ? "Seen" : "Sent"}
          </span>
        ) : null}
      </div>

      {!open ? (
        <button
          type="button"
          onClick={() => onReact(message.id)}
          aria-label="Message actions"
          className="mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold text-zinc-500 opacity-0 transition hover:text-zinc-200 focus:opacity-100 group-hover:opacity-100 lg:opacity-0"
        >
          React · Reply
        </button>
      ) : null}
    </div>
  );
}
