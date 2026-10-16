"use client";

import { Check, Info, AlertTriangle } from "lucide-react";
import { useCliq } from "@/components/CliqProvider";
import { cx } from "@/lib/utils";

export function ToastHost() {
  const { toasts, dismissToast } = useCliq();
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 lg:bottom-8">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismissToast(t.id)}
          className={cx(
            "cliq-toast pointer-events-auto inline-flex max-w-sm items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold shadow-2xl backdrop-blur-xl",
            t.tone === "success"
              ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-200"
              : t.tone === "danger"
                ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                : "border-zinc-700/70 bg-zinc-900/90 text-zinc-100",
          )}
        >
          {t.tone === "success" ? (
            <Check size={15} />
          ) : t.tone === "danger" ? (
            <AlertTriangle size={15} />
          ) : (
            <Info size={15} />
          )}
          <span className="text-left">{t.text}</span>
        </button>
      ))}
    </div>
  );
}
