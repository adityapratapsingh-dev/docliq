"use client";

import { useEffect, useState } from "react";
import { Check, MessageCircle, MessageSquare, UserPlus, X, Zap } from "lucide-react";
import { useCliq } from "@/components/CliqProvider";
import { Avatar, Spinner } from "@/components/ui/Primitives";
import { api } from "@/lib/api-client";
import type { FriendGraph } from "@/types/cliq";
import { cx, timeAgo } from "@/lib/utils";

/**
 * The bell drawer. Real notification content does not exist yet (Step 3), so
 * this surfaces genuine account activity we do have: incoming "Cliq Up"
 * requests and unread direct messages.
 */
export function NotificationDrawer({ onClose, onOpenChats }: { onClose: () => void; onOpenChats: () => void }) {
  const { apiError, setTab, toast } = useCliq();
  const [graph, setGraph] = useState<FriendGraph | null>(null);
  const [unread, setUnread] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    try {
      const [friends, conversations] = await Promise.all([api.getFriends(), api.listConversations()]);
      setGraph(friends);
      setUnread(conversations.reduce((sum, c) => sum + c.unreadCount, 0));
    } catch (error) {
      apiError(error);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function respond(id: string, accept: boolean) {
    setBusyId(id);
    try {
      const updated = await api.respondFriend(id, accept);
      setGraph(updated);
      toast(accept ? "Cliq Up accepted ⚡" : "Request declined", accept ? "success" : "default");
    } catch (error) {
      apiError(error);
    } finally {
      setBusyId(null);
    }
  }

  const incoming = graph?.incoming ?? [];

  return (
    <div
      className="cliq-pop fixed right-3 top-[4.25rem] z-50 w-[min(92vw,22rem)] overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/95 shadow-2xl backdrop-blur-xl sm:right-5"
      data-testid="notification-drawer"
    >
      <div className="flex items-center justify-between border-b border-zinc-800/80 px-4 py-3">
        <p className="text-sm font-bold text-zinc-100">Notifications</p>
        <button type="button" onClick={onClose} aria-label="Close notifications" className="text-zinc-500 hover:text-zinc-200">
          <X size={16} />
        </button>
      </div>

      <div className="cliq-scroll max-h-[60vh] overflow-y-auto p-2">
        {!graph ? (
          <p className="flex items-center gap-2 px-3 py-6 text-xs text-zinc-500">
            <Spinner /> Loading...
          </p>
        ) : incoming.length === 0 && unread === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-zinc-500">
            You&apos;re all caught up ✨
            <br />
            New likes, comments and Cliq Ups will land here.
          </p>
        ) : (
          <>
            {incoming.map((request) => (
              <div key={request.id} className="flex items-start gap-3 rounded-2xl bg-[var(--accent-soft)] p-3">
                <Avatar user={request.user} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                    <UserPlus size={13} className="text-[var(--accent-2)]" />
                    <span className="truncate">{request.user.displayName}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-400">sent you a Cliq Up request ⚡</p>
                  <p className="mt-0.5 text-[10px] text-zinc-600">{timeAgo(request.createdAt)}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => void respond(request.id, true)}
                      className="inline-flex items-center gap-1 rounded-full bg-[var(--accent-grad)] px-3 py-1 text-[11px] font-bold text-white disabled:opacity-50"
                    >
                      <Check size={12} /> Accept
                    </button>
                    <button
                      type="button"
                      disabled={busyId === request.id}
                      onClick={() => void respond(request.id, false)}
                      className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] font-semibold text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {unread > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setTab("friends");
                  onOpenChats();
                }}
                className={cx(
                  "mt-1 flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-zinc-800/60",
                  incoming.length > 0 && "mt-2",
                )}
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--accent-soft)] text-[var(--accent-2)]">
                  <MessageSquare size={15} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-zinc-200">
                    {unread} unread message{unread > 1 ? "s" : ""}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-400">
                    <MessageCircle size={11} /> Open Direct Chats
                  </span>
                </span>
              </button>
            ) : null}
          </>
        )}
      </div>

      <button
        type="button"
        onClick={() => {
          setTab("friends");
          onOpenChats();
          onClose();
        }}
        className="inline-flex w-full items-center justify-center gap-1.5 border-t border-zinc-800/80 px-4 py-3 text-xs font-semibold text-[var(--accent-2)] transition hover:bg-zinc-800/60"
      >
        <Zap size={13} /> Open Chats &amp; Friends
      </button>
    </div>
  );
}
