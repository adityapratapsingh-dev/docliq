"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  Bell,
  Bookmark,
  Database,
  Film,
  Image as ImageIcon,
  LogOut,
  MessageSquare,
  Palette,
  Pencil,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { useCliq } from "@/components/CliqProvider";
import { api } from "@/lib/api-client";
import { Avatar, EmptyState, Modal, SectionCard, Toggle } from "@/components/ui/Primitives";
import { ACCENT_LIST } from "@/lib/theme";
import { INTEREST_OPTIONS, MESSAGE_SCOPES } from "@/lib/constants";
import { PostCardMini } from "@/components/tabs/PostCardMini";
import { useFeed } from "@/components/tabs/useFeed";
import type { AccentKey, SessionUser } from "@/types/cliq";
import { cx } from "@/lib/utils";

export function ProfileTab() {
  const { user, apiError, fallbackMode, dbError, savedIds } = useCliq();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [profileTab, setProfileTab] = useState<"posts" | "videos" | "photos" | "saved">("posts");

  const { posts: videoPosts } = useFeed("video");
  const { posts: photoPosts } = useFeed("photo");
  const { posts: chatPosts } = useFeed("chat");

  if (!user) return null;

  if (settingsOpen) {
    return (
      <SettingsPanel
        user={user}
        onBack={() => setSettingsOpen(false)}
        fallbackMode={fallbackMode}
        dbError={dbError}
      />
    );
  }

  const mineVideos = videoPosts.filter((p) => p.userId === user.id);
  const minePhotos = photoPosts.filter((p) => p.userId === user.id);
  const mineChats = chatPosts.filter((p) => p.userId === user.id);
  const allPosts = [...mineVideos, ...minePhotos, ...mineChats];
  const saved = [...videoPosts, ...photoPosts, ...chatPosts].filter((p) => savedIds.includes(p.id));

  const cliqScore = allPosts.reduce(
    (sum, p) => sum + p.likesCount + p.upgradesCount - p.dislikesCount - p.downgradesCount,
    0,
  );

  const shown =
    profileTab === "videos" ? mineVideos : profileTab === "photos" ? minePhotos : profileTab === "posts" ? mineChats : saved;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4">
      <ProfileHeader
        user={user}
        postCount={allPosts.length}
        cliqScore={cliqScore}
        onEdit={() => setEditOpen(true)}
        onSettings={() => setSettingsOpen(true)}
      />

      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-zinc-800/80 bg-zinc-900/70 p-1 backdrop-blur-md">
        {(
          [
            { key: "videos", label: "Videos", icon: Film },
            { key: "photos", label: "Photos", icon: ImageIcon },
            { key: "posts", label: "Posts", icon: MessageSquare },
            { key: "saved", label: "Saved", icon: Bookmark },
          ] as const
        ).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setProfileTab(key)}
            className={cx(
              "inline-flex items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-bold transition",
              profileTab === key ? "bg-[var(--accent-grad)] text-white" : "text-zinc-400 hover:text-zinc-100",
            )}
          >
            <Icon size={14} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Sparkles size={24} />}
          title={
            profileTab === "saved"
              ? "Nothing saved yet"
              : `No ${profileTab === "posts" ? "chat posts" : profileTab} yet`
          }
          hint={
            profileTab === "saved"
              ? "Tap the bookmark icon on any post to save it here."
              : "Anything you post on Cliq shows up here."
          }
        />
      ) : (
        <div className={cx("grid gap-3", profileTab !== "posts" && "sm:grid-cols-2")}>
          {shown.map((post) => (
            <PostCardMini key={post.id} post={post} viewerId={user.id} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/50 px-4 py-3">
        <span className="text-[11px] text-zinc-500">
          Signed in as @{user.username}
          {user.age ? ` · ${user.age}` : ""}
        </span>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-2)] hover:underline"
        >
          <SettingsIcon size={13} /> Settings
        </button>
      </div>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} user={user} onError={apiError} />
    </div>
  );
}

function ProfileHeader({
  user,
  postCount,
  cliqScore,
  onEdit,
  onSettings,
}: {
  user: SessionUser;
  postCount: number;
  cliqScore: number;
  onEdit: () => void;
  onSettings: () => void;
}) {
  const [bannerBroken, setBannerBroken] = useState(false);
  const banner = user.bannerUrl && !bannerBroken ? user.bannerUrl : null;

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800/80 bg-zinc-900/80 backdrop-blur-md">
      <div className="relative h-32 w-full sm:h-40">
        {banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={banner} alt="" className="h-full w-full object-cover" onError={() => setBannerBroken(true)} />
        ) : (
          <div className="h-full w-full bg-[var(--accent-grad)]">
            <div className="cliq-drift h-full w-full opacity-70" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/70 to-transparent" />
      </div>

      <div className="relative px-4 pb-4">
        <div className="-mt-9 flex items-end justify-between">
          <div className="cliq-pulse-ring rounded-full">
            <Avatar user={user} size={78} ring />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-grad)] px-3.5 py-2 text-xs font-bold text-white transition hover:brightness-110 active:scale-95"
            >
              <Pencil size={13} /> Edit Profile
            </button>
            <button
              type="button"
              onClick={onSettings}
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3.5 py-2 text-xs font-bold text-zinc-300 transition hover:border-[var(--accent)] hover:text-zinc-100"
            >
              <SettingsIcon size={13} /> Settings
            </button>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-black text-zinc-50">{user.displayName}</h1>
            <BadgeCheck size={17} className="text-[var(--accent-2)]" />
          </div>
          <p className="text-xs text-zinc-500">
            @{user.username}
            {user.age ? ` · ${user.age}` : ""}
          </p>
          {user.bio ? <p className="mt-2 text-sm leading-relaxed text-zinc-300">{user.bio}</p> : null}
          {(user.interests ?? []).length > 0 ? (
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(user.interests ?? []).map((interest) => (
                <span
                  key={interest}
                  className="rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-2)]"
                >
                  #{interest}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { label: "Posts", value: `${postCount}` },
            { label: "Cliq Score", value: `${cliqScore}` },
            { label: "Friends", value: "—" },
            { label: "Following", value: "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl border border-zinc-800/70 bg-zinc-950/50 px-2 py-2.5 text-center">
              <p className="text-base font-black text-zinc-50">{value}</p>
              <p className="text-[10px] text-zinc-500">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EditProfileModal({
  open,
  onClose,
  user,
  onError,
}: {
  open: boolean;
  onClose: () => void;
  user: SessionUser;
  onError: (error: unknown) => void;
}) {
  const { refreshUser, toast } = useCliq();
  const [displayName, setDisplayName] = useState(user.displayName);
  const [bio, setBio] = useState(user.bio);
  const [age, setAge] = useState(user.age ? `${user.age}` : "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [interests, setInterests] = useState<string[]>(user.interests ?? []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDisplayName(user.displayName);
    setBio(user.bio);
    setAge(user.age ? `${user.age}` : "");
    setAvatarUrl(user.avatarUrl ?? "");
    setInterests(user.interests);
  }, [open, user]);

  async function save() {
    setBusy(true);
    try {
      await api.updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
        age: age.trim() ? Number(age) : null,
        avatarUrl: avatarUrl.trim() || null,
        interests,
      });
      await refreshUser();
      toast("Profile updated ✨", "success");
      onClose();
    } catch (error) {
      onError(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit Profile" subtitle="Keep it real — your vibe, your rules.">
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-3">
          <Avatar
            user={{ id: user.id, username: user.username, displayName: displayName || user.displayName, avatarUrl: avatarUrl || null }}
            size={52}
            ring
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-zinc-100">{displayName || user.displayName}</p>
            <p className="truncate text-[11px] text-zinc-500">@{user.username}</p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-[var(--accent)] hover:text-zinc-100">
            <ImageIcon size={13} /> Upload
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setAvatarUrl(typeof reader.result === "string" ? reader.result : "");
                reader.readAsDataURL(file);
              }}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-400">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={60}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-400">Age</span>
            <input
              value={age}
              onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-zinc-400">Avatar image URL</span>
            <input
              value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-zinc-400">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={300}
            className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
          />
        </label>

        <div>
          <span className="mb-1.5 block text-xs font-semibold text-zinc-400">Interests</span>
          <div className="flex flex-wrap gap-1.5">
            {INTEREST_OPTIONS.map((interest) => {
              const active = interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => setInterests((prev) => (active ? prev.filter((i) => i !== interest) : [...prev, interest]))}
                  className={cx(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition",
                    active ? "border-transparent bg-[var(--accent-grad)] text-white" : "border-zinc-800 text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  {active ? "✓ " : ""}
                  {interest}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void save()}
          disabled={busy}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-2xl bg-[var(--accent-grad)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? "Saving..." : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}

function SettingsPanel({
  user,
  onBack,
  fallbackMode,
  dbError,
}: {
  user: SessionUser;
  onBack: () => void;
  fallbackMode: boolean;
  dbError: string | null;
}) {
  const { settings, updateSettings, logOut, toast } = useCliq();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-3 py-4 sm:px-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-[var(--accent)] hover:text-zinc-100"
        >
          <X size={13} /> Back to profile
        </button>
        <h2 className="text-sm font-bold text-zinc-100">Settings</h2>
      </div>

      {fallbackMode ? (
        <div className="flex items-start gap-3 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" />
          <div className="text-xs leading-relaxed text-amber-100">
            <p className="font-bold">Storage is running in fallback mode</p>
            <p className="mt-1 text-amber-200/80">
              Cliq is using a temporary in-memory store, so data may disappear when the server
              restarts. If you have already set the Cloudflare variables in Vercel, check that the
              values are correct and then redeploy; otherwise add{" "}
              <code className="rounded bg-zinc-950/60 px-1">CLOUDFLARE_ACCOUNT_ID</code>,{" "}
              <code className="rounded bg-zinc-950/60 px-1">CLOUDFLARE_DATABASE_ID</code>,{" "}
              <code className="rounded bg-zinc-950/60 px-1">CLOUDFLARE_API_TOKEN</code> and{" "}
              <code className="rounded bg-zinc-950/60 px-1">CLIQ_SESSION_SECRET</code>. Tables are
              created automatically on the next request.
            </p>
            {dbError ? (
              <p className="mt-2 break-words rounded-xl bg-zinc-950/50 px-2.5 py-2 font-mono text-[11px] text-amber-200/90">
                {dbError}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-3xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-xs font-semibold text-emerald-200">
          <Database size={14} /> Connected to Cloudflare D1 — your data is persisted.
        </div>
      )}

      <SectionCard>
        <SectionTitle icon={<User size={15} />} title="Account & Profile" />
        <div className="mt-3 space-y-2 text-sm">
          <Row label="Username" value={`@${user.username}`} />
          <Row label="Email" value={user.email || "Not set"} />
          <Row label="Age tier" value="Teen Verified 13–19" badge />
          <Row label="Account status" value="Active · In good standing" />
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle icon={<Shield size={15} />} title="Teen Safety & Privacy" />
        <div className="mt-3 space-y-2">
          <Toggle
            checked={settings.privateProfile}
            onChange={(v) => {
              void updateSettings({ privateProfile: v });
              toast(v ? "Profile is now private 🔒" : "Profile is public again", v ? "success" : "default");
            }}
            label="Private Cliq Profile"
            hint="Only approved Cliq friends can see your posts"
          />
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-100">Who Can Message Me</p>
            <p className="mb-2 mt-0.5 text-xs text-zinc-500">Control who can start a direct chat with you</p>
            <div className="flex flex-wrap gap-1.5">
              {MESSAGE_SCOPES.map((scope) => (
                <button
                  key={scope.key}
                  type="button"
                  onClick={() => {
                    void updateSettings({ whoCanMessage: scope.key });
                    toast(`Messages: ${scope.label}`, "success");
                  }}
                  className={cx(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition",
                    settings.whoCanMessage === scope.key
                      ? "border-transparent bg-[var(--accent-grad)] text-white"
                      : "border-zinc-800 text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </div>
          <Toggle
            checked={settings.showOnline}
            onChange={(v) => void updateSettings({ showOnline: v })}
            label="Show Online Activity Status"
            hint="Let friends see when you're active"
          />
          <Toggle
            checked={settings.hideDislikes}
            onChange={(v) => {
              void updateSettings({ hideDislikes: v });
              toast(v ? "Dislike counts hidden on your posts" : "Dislike counts visible", "success");
            }}
            label="Hide Dislike & Downgrade Counts on My Posts"
            hint="Feed rendering updates instantly"
          />
          <Toggle
            checked={settings.toxicFilter}
            onChange={(v) => void updateSettings({ toxicFilter: v })}
            label="Safe-Chat Toxic Word Filter"
            hint="Softens unkind words in content you view"
          />
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle icon={<Palette size={15} />} title="Appearance & Theme Vibe" />
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 px-4 py-3">
            <p className="text-sm font-semibold text-zinc-100">Accent color</p>
            <p className="mb-2 mt-0.5 text-xs text-zinc-500">Changes highlights across the whole app</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ACCENT_LIST.map((accent) => (
                <button
                  key={accent.key}
                  type="button"
                  onClick={() => {
                    void updateSettings({ accent: accent.key as AccentKey });
                    toast(`${accent.label} applied 🎨`, "success");
                  }}
                  className={cx(
                    "relative overflow-hidden rounded-2xl border px-3 py-2.5 text-left transition",
                    settings.accent === accent.key ? "border-zinc-100" : "border-zinc-800 hover:border-zinc-600",
                  )}
                  style={{ background: accent.soft }}
                >
                  <span className="block h-2 w-full rounded-full" style={{ background: accent.gradient }} />
                  <span className="mt-1.5 block text-[11px] font-bold text-zinc-100">{accent.label}</span>
                </button>
              ))}
            </div>
          </div>
          <Toggle
            checked={settings.autoplay}
            onChange={(v) => void updateSettings({ autoplay: v })}
            label="Auto-Play Videos"
            hint="Videos start playing as you scroll the feed"
          />
        </div>
      </SectionCard>

      <SectionCard>
        <SectionTitle icon={<Bell size={15} />} title="Notifications" />
        <div className="mt-3 space-y-2">
          <Toggle checked={settings.notifCliqUp} onChange={(v) => void updateSettings({ notifCliqUp: v })} label='"Cliq Up" Friend Requests' />
          <Toggle checked={settings.notifMessages} onChange={(v) => void updateSettings({ notifMessages: v })} label="Direct Messages" />
          <Toggle checked={settings.notifVotes} onChange={(v) => void updateSettings({ notifVotes: v })} label="Post Upgrades & Likes" />
          <Toggle checked={settings.notifComments} onChange={(v) => void updateSettings({ notifComments: v })} label="Comments" />
        </div>
      </SectionCard>

      <SectionCard className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Shield size={13} /> Passwords are hashed. Session cookies are httpOnly.
        </div>
        <button
          type="button"
          onClick={() => void logOut()}
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/50 px-3.5 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/10"
        >
          <LogOut size={13} /> Log Out
        </button>
      </SectionCard>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent-2)]">
        {icon}
      </span>
      <h3 className="text-sm font-bold text-zinc-100">{title}</h3>
    </div>
  );
}

function Row({ label, value, badge }: { label: string; value: string; badge?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-zinc-950/50 px-3 py-2">
      <span className="text-xs text-zinc-500">{label}</span>
      <span
        className={cx(
          "truncate text-xs font-semibold",
          badge ? "rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2 py-0.5 text-emerald-300" : "text-zinc-200",
        )}
      >
        {value}
      </span>
    </div>
  );
}

