import type { CSSProperties } from "react";
import type { AccentKey } from "@/types/cliq";

export interface AccentDef {
  key: AccentKey;
  label: string;
  accent: string;
  accent2: string;
  accent3: string;
  gradient: string;
  soft: string;
}

export const ACCENTS: Record<AccentKey, AccentDef> = {
  violet: {
    key: "violet",
    label: "Neon Violet",
    accent: "#8b5cf6",
    accent2: "#e879f9",
    accent3: "#22d3ee",
    gradient: "linear-gradient(135deg, #7c3aed 0%, #d946ef 55%, #22d3ee 100%)",
    soft: "rgba(139, 92, 246, 0.18)",
  },
  cyan: {
    key: "cyan",
    label: "Cyber Cyan",
    accent: "#22d3ee",
    accent2: "#38bdf8",
    accent3: "#a855f7",
    gradient: "linear-gradient(135deg, #0891b2 0%, #22d3ee 55%, #a855f7 100%)",
    soft: "rgba(34, 211, 238, 0.18)",
  },
  rose: {
    key: "rose",
    label: "Electric Rose",
    accent: "#fb7185",
    accent2: "#f472b6",
    accent3: "#a78bfa",
    gradient: "linear-gradient(135deg, #e11d48 0%, #f472b6 55%, #a78bfa 100%)",
    soft: "rgba(251, 113, 133, 0.18)",
  },
  emerald: {
    key: "emerald",
    label: "Matrix Emerald",
    accent: "#34d399",
    accent2: "#22d3ee",
    accent3: "#a3e635",
    gradient: "linear-gradient(135deg, #059669 0%, #34d399 55%, #a3e635 100%)",
    soft: "rgba(52, 211, 153, 0.18)",
  },
};

export const ACCENT_LIST: AccentDef[] = [
  ACCENTS.violet,
  ACCENTS.cyan,
  ACCENTS.rose,
  ACCENTS.emerald,
];

export function accentVars(key: AccentKey): CSSProperties {
  const a = ACCENTS[key] ?? ACCENTS.violet;
  return {
    "--accent": a.accent,
    "--accent-2": a.accent2,
    "--accent-3": a.accent3,
    "--accent-grad": a.gradient,
    "--accent-soft": a.soft,
  } as CSSProperties;
}
