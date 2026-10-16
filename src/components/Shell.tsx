"use client";

import {
  Bell,
  Film,
  Home,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  Users,
  X,
  Zap,
} from "lucide-react";
import { type ReactNode } from "react";
import { useCliq } from "@/components/CliqProvider";
import { Avatar } from "@/components/ui/Primitives";
import type { TabKey } from "@/types/cliq";
import { cx } from "@/lib/utils";

export const NAV_ITEMS: { key: TabKey; label: string; icon: typeof Home }[] = [
  { key: "videos", label: "Videos", icon: Film },
  { key: "photos", label: "Photos", icon: ImageIcon },
  { key: "chatposts", label: "Chat Posts", icon: MessageSquare },
  { key: "friends", label: "Chats", icon: Users },
  { key: "profile", label: "Profile", icon: Home },
];

export function CliqLogo({ compact }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="relative grid h-10 w-10 place-items-center rounded-2xl bg-[var(--accent-grad)] shadow-[0_0_22px_-4px_var(--accent)]">
        <Zap size={20} className="text-white" fill="currentColor" />
        <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full border border-zinc-950 bg-zinc-900 text-[var(--accent-2)]">
          <Sparkles size={11} />
        </span>
      </span>
      {!compact ? (
        <span className="leading-none">
          <span className="block text-xl font-black tracking-tight text-zinc-50">Cliq</span>
          <span className="block text-[11px] font-medium text-zinc-500">Find your Cliq</span>
        </span>
      ) : null}
    </div>
  );
}

export function Header({
  search,
  onSearch,
  bellCount,
  onBell,
  onProfile,
}: {
  search: string;
  onSearch: (value: string) => void;
  bellCount: number;
  onBell: () => void;
  onProfile: () => void;
}) {
  const { user, setCreateOpen } = useCliq();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-3 sm:px-5">
        <div className="lg:hidden">
          <CliqLogo compact />
        </div>
        <div className="hidden lg:block">
          <CliqLogo />
        </div>

        <div className="relative ml-auto flex min-w-0 flex-1 items-center lg:mx-6 lg:max-w-xl">
          <Search size={16} className="pointer-events-none absolute left-3 text-zinc-500" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search posts, #hashtags, vibes..."
            className="h-10 w-full rounded-full border border-zinc-800/80 bg-zinc-900/70 pl-9 pr-9 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-[var(--accent)] focus:bg-zinc-900"
          />
          {search ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearch("")}
              className="absolute right-3 text-zinc-500 transition hover:text-zinc-200"
            >
              <X size={15} />
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="hidden h-10 items-center gap-1.5 rounded-full bg-[var(--accent-grad)] px-4 text-sm font-bold text-white shadow-[0_0_20px_-6px_var(--accent)] transition hover:brightness-110 active:scale-95 sm:inline-flex"
        >
          <Plus size={16} strokeWidth={3} /> Create
        </button>

        <button
          type="button"
          aria-label="Notifications"
          onClick={onBell}
          className="relative grid h-10 w-10 place-items-center rounded-full border border-zinc-800/80 bg-zinc-900/70 text-zinc-300 transition hover:border-zinc-700 hover:text-zinc-100"
        >
          <Bell size={18} />
          {bellCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent-grad)] px-1 text-[10px] font-bold text-white">
              {bellCount}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full bg-[var(--accent-grad)] text-white transition active:scale-95 sm:hidden"
          aria-label="Create post"
        >
          <Plus size={20} strokeWidth={3} />
        </button>

        {user ? (
          <button type="button" onClick={onProfile} className="hidden sm:block" aria-label="Your profile">
            <Avatar user={user} size={38} />
          </button>
        ) : null}
      </div>
    </header>
  );
}

export function Sidebar({ children }: { children?: ReactNode }) {
  const { tab, setTab, user } = useCliq();

  return (
    <aside className="cliq-scroll sticky top-16 hidden h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-zinc-800/80 px-3 py-5 lg:flex">
      <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-widest text-zinc-500">Explore Cliq</p>
      {NAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const active = tab === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cx(
              "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition",
              active ? "bg-[var(--accent-soft)] text-zinc-50" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100",
            )}
          >
            <span
              className={cx(
                "grid h-8 w-8 place-items-center rounded-xl transition",
                active ? "bg-[var(--accent-grad)] text-white" : "bg-zinc-900 text-zinc-400 group-hover:text-zinc-100",
              )}
            >
              <Icon size={16} />
            </span>
            <span className="flex-1 text-left">{label}</span>
            {active ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> : null}
          </button>
        );
      })}

      {children}

      <p className="mt-auto px-3 pt-3 text-[10px] leading-relaxed text-zinc-600">
        Cliq · Find your Cliq. Share your vibe.
        {user ? (
          <>
            <br />
            Signed in as @{user.username}
          </>
        ) : null}
      </p>
    </aside>
  );
}

export function BottomNav() {
  const { tab, setTab, setCreateOpen, user } = useCliq();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {NAV_ITEMS.slice(0, 2).map(({ key, label, icon: Icon }) => (
          <NavButton key={key} active={tab === key} label={label} Icon={Icon} onClick={() => setTab(key)} />
        ))}
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label="Create post"
          className="grid h-12 w-12 -translate-y-3 place-items-center rounded-2xl bg-[var(--accent-grad)] text-white shadow-[0_0_22px_-4px_var(--accent)] transition active:scale-90"
        >
          <Plus size={24} strokeWidth={3} />
        </button>
        {NAV_ITEMS.slice(2).map(({ key, label, icon: Icon }) => (
          <NavButton
            key={key}
            active={tab === key}
            label={label}
            Icon={Icon}
            onClick={() => setTab(key)}
            avatar={key === "profile" && user ? <Avatar user={user} size={22} /> : undefined}
          />
        ))}
      </div>
    </nav>
  );
}

function NavButton({
  active,
  label,
  Icon,
  onClick,
  avatar,
}: {
  active: boolean;
  label: string;
  Icon: typeof Home;
  onClick: () => void;
  avatar?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "relative flex w-16 flex-col items-center gap-0.5 rounded-xl py-2 text-[10px] font-semibold transition",
        active ? "text-[var(--accent-2)]" : "text-zinc-500",
      )}
    >
      {avatar ? (
        <span className={cx("rounded-full", active && "ring-2 ring-[var(--accent)]")}>{avatar}</span>
      ) : (
        <Icon size={20} className={cx(active && "drop-shadow-[0_0_6px_var(--accent)]")} />
      )}
      <span>{label}</span>
    </button>
  );
}
