"use client";

import { useState } from "react";
import { AtSign, Camera, LogIn, Sparkles, UserPlus, Zap } from "lucide-react";
import { api } from "@/lib/api-client";
import { INTEREST_OPTIONS } from "@/lib/constants";
import { Avatar } from "@/components/ui/Primitives";
import type { PublicUser, SessionUser } from "@/types/cliq";
import { cx } from "@/lib/utils";

type Mode = "signup" | "login";

export function AuthScreen({ onAuthed }: { onAuthed: (user: SessionUser) => void }) {
  const [mode, setMode] = useState<Mode>("signup");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit =
    mode === "login"
      ? Boolean(username.trim() && password)
      : Boolean(username.trim() && displayName.trim() && password.length >= 6);

  const preview: Pick<PublicUser, "id" | "username" | "displayName" | "avatarUrl"> = {
    id: "preview",
    username: username || "you",
    displayName: displayName || "New Cliq user",
    avatarUrl: avatarUrl || null,
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    try {
      const { user } =
        mode === "login"
          ? await api.logIn(username.trim().replace(/^@/, ""), password)
          : await api.signUp({
              username: username.trim().replace(/^@/, ""),
              displayName: displayName.trim(),
              password,
              age: age.trim() ? Number(age) : null,
              bio: bio.trim(),
              avatarUrl: avatarUrl.trim() || null,
              interests,
            });
      onAuthed(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-zinc-950 px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div className="cliq-drift absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[var(--accent-grad)] opacity-20 blur-3xl" />
        <div
          className="cliq-drift absolute -right-24 bottom-0 h-[28rem] w-[28rem] rounded-full bg-[var(--accent-grad)] opacity-10 blur-3xl"
          style={{ animationDelay: "3s" }}
        />
      </div>

      <div className="relative grid w-full max-w-4xl gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        {/* Brand panel */}
        <div className="cliq-rise hidden flex-col gap-5 lg:flex">
          <div className="flex items-center gap-3">
            <span className="relative grid h-14 w-14 place-items-center rounded-2xl bg-[var(--accent-grad)] shadow-[0_0_28px_-4px_var(--accent)]">
              <Zap size={26} className="text-white" fill="currentColor" />
              <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-zinc-950 bg-zinc-900 text-[var(--accent-2)]">
                <Sparkles size={13} />
              </span>
            </span>
            <span>
              <span className="block text-3xl font-black tracking-tight text-zinc-50">Cliq</span>
              <span className="block text-xs font-medium text-zinc-500">Find your Cliq</span>
            </span>
          </div>
          <h1 className="text-4xl font-black leading-tight text-zinc-50">
            Find your <span className="cliq-gradient-text">Cliq.</span>
            <br />
            Share your vibe.
          </h1>
          <p className="max-w-sm text-sm leading-relaxed text-zinc-400">
            Post videos, photos and late-night thoughts. Upgrade the best takes, Cliq Up new friends
            who match your interests, and chat in real time. Built for teens, safe by design.
          </p>
          <ul className="space-y-2 text-sm text-zinc-400">
            {["Real people, no bots", "Teen safety controls built in", "Videos, photos, chat posts & DMs"].map(
              (line) => (
                <li key={line} className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
                  {line}
                </li>
              ),
            )}
          </ul>
        </div>

        {/* Form card */}
        <div className="cliq-rise rounded-3xl border border-zinc-800/80 bg-zinc-900/80 p-6 backdrop-blur-xl sm:p-8">
          <div className="mb-5 flex items-center gap-3 lg:hidden">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent-grad)]">
              <Zap size={20} className="text-white" fill="currentColor" />
            </span>
            <span>
              <span className="block text-xl font-black text-zinc-50">Cliq</span>
              <span className="block text-[11px] text-zinc-500">Find your Cliq</span>
            </span>
          </div>

          <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-950/60 p-1">
            {(
              [
                { key: "signup", label: "Sign Up", icon: UserPlus },
                { key: "login", label: "Log In", icon: LogIn },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMode(key);
                  setError(null);
                }}
                className={cx(
                  "inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-sm font-bold transition",
                  mode === key ? "bg-[var(--accent-grad)] text-white" : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" ? (
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-800/80 bg-zinc-950/50 p-3">
                <Avatar user={preview} size={52} ring />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-zinc-100">{preview.displayName}</p>
                  <p className="truncate text-[11px] text-zinc-500">@{preview.username}</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-700 px-3 py-1.5 text-[11px] font-semibold text-zinc-300 transition hover:border-[var(--accent)] hover:text-zinc-100">
                  <Camera size={13} /> Avatar
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
            ) : null}

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">@username</span>
              <div className="relative">
                <AtSign size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_@]/g, "").toLowerCase())}
                  autoComplete="username"
                  placeholder="yourhandle"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 py-2.5 pl-9 pr-3 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
                />
              </div>
            </label>

            {mode === "signup" ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-400">Display name</span>
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={60}
                    placeholder="Riley Chen"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-[7rem_1fr]">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-400">Age</span>
                    <input
                      value={age}
                      onChange={(e) => setAge(e.target.value.replace(/\D/g, "").slice(0, 3))}
                      inputMode="numeric"
                      placeholder="16"
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-zinc-400">Avatar image URL (optional)</span>
                    <input
                      value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                </div>
              </>
            ) : null}

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-zinc-400">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
              />
            </label>

            {mode === "signup" ? (
              <>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-zinc-400">Bio (optional)</span>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={2}
                    maxLength={300}
                    placeholder="Tell your Cliq what you're about..."
                    className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950/60 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--accent)]"
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
                          onClick={() =>
                            setInterests((prev) =>
                              active ? prev.filter((i) => i !== interest) : [...prev, interest],
                            )
                          }
                          className={cx(
                            "rounded-full border px-3 py-1 text-xs font-semibold transition",
                            active
                              ? "border-transparent bg-[var(--accent-grad)] text-white"
                              : "border-zinc-800 text-zinc-400 hover:text-zinc-200",
                          )}
                        >
                          {active ? "✓ " : ""}
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}

            {error ? (
              <p className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-200">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmit || busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent-grad)] px-4 py-3 text-sm font-bold text-white transition hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Just a sec..." : mode === "signup" ? "Create my Cliq account" : "Log in to Cliq"}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-zinc-600">
              Your password is hashed before it is stored. Cliq is built for ages 13–19 with teen
              safety controls on by default.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
