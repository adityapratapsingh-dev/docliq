"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ApiClientError, api } from "@/lib/api-client";
import { DEFAULT_SETTINGS, type SessionUser, type Settings, type TabKey, type Toast } from "@/types/cliq";

interface CliqContextValue {
  /** null while the session is being resolved; false-ish once loaded = logged out */
  user: SessionUser | null;
  loading: boolean;
  fallbackMode: boolean;
  /** underlying database error text, when one has occurred */
  dbError: string | null;
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  createOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  toasts: Toast[];
  toast: (text: string, tone?: Toast["tone"]) => void;
  dismissToast: (id: string) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => Promise<void>;
  refreshUser: () => Promise<void>;
  logOut: () => Promise<void>;
  /** Shared "bump" so tabs refetch when data changes elsewhere. */
  revision: number;
  bump: () => void;
  /** Post ids the user has locally marked saved. */
  savedIds: string[];
  toggleSaved: (postId: string) => void;
  apiError: (error: unknown) => void;
}

const CliqContext = createContext<CliqContextValue | null>(null);

export function useCliq(): CliqContextValue {
  const ctx = useContext(CliqContext);
  if (!ctx) throw new Error("useCliq must be used inside CliqProvider");
  return ctx;
}

export function CliqProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("videos");
  const [createOpen, setCreateOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [revision, setRevision] = useState(0);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const counter = useRef(0);

  const toast = useCallback((text: string, tone: Toast["tone"] = "default") => {
    counter.current += 1;
    const id = `t_${counter.current}_${Date.now()}`;
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const apiError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiClientError) {
        if (error.status === 503) {
          setFallbackMode(true);
          // Keep the underlying cause so Settings can show something actionable.
          setDbError(error.detail ?? error.message);
        }
        toast(error.message, "danger");
      } else {
        toast("Something went wrong. Please try again.", "danger");
      }
    },
    [toast],
  );

  const refreshUser = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await api.me();
        if (!cancelled) setUser(me);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Local storage hint so we can surface the D1 setup notice before any request.
  useEffect(() => {
    const stored = window.localStorage.getItem("cliq:saved");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) setSavedIds(parsed.filter((v): v is string => typeof v === "string"));
      } catch {
        /* ignore malformed */
      }
    }
  }, []);

  const bump = useCallback(() => setRevision((r) => r + 1), []);

  const toggleSaved = useCallback((postId: string) => {
    setSavedIds((prev) => {
      const next = prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId];
      window.localStorage.setItem("cliq:saved", JSON.stringify(next));
      return next;
    });
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      if (!user) return;
      const optimistic = { ...user.settings, ...patch };
      setUser({ ...user, settings: optimistic });
      try {
        const { user: updated } = await api.updateProfile({ settings: optimistic });
        setUser(updated);
      } catch (error) {
        setUser({ ...user });
        apiError(error);
      }
    },
    [user, apiError],
  );

  const logOut = useCallback(async () => {
    try {
      await api.logOut();
    } catch {
      /* logging out locally is enough */
    }
    setUser(null);
    setTab("videos");
    setSavedIds([]);
    window.localStorage.removeItem("cliq:saved");
  }, []);

  const settings = user?.settings ?? DEFAULT_SETTINGS;

  const value = useMemo<CliqContextValue>(
    () => ({
      user,
      loading,
      fallbackMode,
      dbError,
      tab,
      setTab,
      createOpen,
      setCreateOpen,
      toasts,
      toast,
      dismissToast,
      settings,
      updateSettings,
      refreshUser,
      logOut,
      revision,
      bump,
      savedIds,
      toggleSaved,
      apiError,
    }),
    [
      user,
      loading,
      fallbackMode,
      dbError,
      tab,
      createOpen,
      toasts,
      toast,
      dismissToast,
      settings,
      updateSettings,
      refreshUser,
      logOut,
      revision,
      bump,
      savedIds,
      toggleSaved,
      apiError,
    ],
  );

  return <CliqContext.Provider value={value}>{children}</CliqContext.Provider>;
}
