"use client";

import { useEffect, useState } from "react";
import { useCliq } from "@/components/CliqProvider";
import { AuthScreen } from "@/components/AuthScreen";
import { BottomNav, Header, Sidebar } from "@/components/Shell";
import { CreateModal } from "@/components/CreateModal";
import { ToastHost } from "@/components/ToastHost";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { VideosTab } from "@/components/tabs/VideosTab";
import { PhotosTab } from "@/components/tabs/PhotosTab";
import { ChatPostsTab } from "@/components/tabs/ChatPostsTab";
import { FriendsTab } from "@/components/tabs/FriendsTab";
import { ProfileTab } from "@/components/tabs/ProfileTab";
import { accentVars } from "@/lib/theme";
import { Spinner } from "@/components/ui/Primitives";

export function CliqApp() {
  const { user, loading, settings, tab, setTab, refreshUser, bump } = useCliq();
  const [search, setSearch] = useState("");
  const [bellOpen, setBellOpen] = useState(false);

  useEffect(() => {
    if (tab !== "friends") setBellOpen(false);
  }, [tab]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Spinner className="h-6 w-6" />
          <p className="text-xs text-zinc-500">Warming up Cliq...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={accentVars(settings.accent)}>
        <AuthScreen
          onAuthed={() => {
            void refreshUser();
            setTab("videos");
          }}
        />
        <ToastHost />
      </div>
    );
  }

  return (
    <div style={accentVars(settings.accent)} className="min-h-dvh bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="cliq-drift absolute -left-24 -top-24 h-72 w-72 rounded-full opacity-20 blur-3xl"
          style={{ background: "var(--accent-grad)" }}
        />
        <div
          className="cliq-drift absolute -right-20 top-1/3 h-80 w-80 rounded-full opacity-10 blur-3xl"
          style={{ background: "var(--accent-grad)", animationDelay: "3s" }}
        />
      </div>

      <div className="relative">
        <Header
          search={search}
          onSearch={setSearch}
          bellCount={0}
          onBell={() => setBellOpen((v) => !v)}
          onProfile={() => setTab("profile")}
        />
        {bellOpen ? (
          <NotificationDrawer onClose={() => setBellOpen(false)} onOpenChats={() => setTab("friends")} />
        ) : null}
        <div className="mx-auto flex max-w-7xl">
          <Sidebar />
          <main className="cliq-scroll min-w-0 flex-1 pb-24 lg:pb-8">
            {tab === "videos" ? (
              <VideosTab search={search} />
            ) : tab === "photos" ? (
              <PhotosTab search={search} />
            ) : tab === "chatposts" ? (
              <ChatPostsTab search={search} />
            ) : tab === "friends" ? (
              <FriendsTab search={search} onDataChanged={bump} />
            ) : (
              <ProfileTab />
            )}
          </main>
        </div>
      </div>

      <BottomNav />
      <CreateModal />
      <ToastHost />
    </div>
  );
}
