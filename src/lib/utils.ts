export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function formatCount(n: number): string {
  if (Math.abs(n) < 1000) return `${n}`;
  if (Math.abs(n) < 1_000_000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "just now";
  const diff = Math.max(0, Date.now() - then);
  const s = Math.floor(diff / 1000);
  if (s < 45) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}w`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function clockTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "now";
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function extractHashtags(text: string): string[] {
  const found = text.match(/#[\p{L}\p{N}_]+/gu);
  return found ? Array.from(new Set(found.map((t) => t.slice(1)))) : [];
}

const TOXIC_WORDS = ["stupid", "idiot", "loser", "hate you", "dumb", "ugly"];

/** Soft-censor unkind words when the Safe-Chat filter is enabled. */
export function censor(text: string, enabled: boolean): string {
  if (!enabled) return text;
  let out = text;
  for (const word of TOXIC_WORDS) {
    const re = new RegExp(word.replace(/ /g, "\\s+"), "gi");
    out = out.replace(re, (m) => "•".repeat(Math.max(3, m.length)));
  }
  return out;
}

/** Deterministic gradient for a user without an avatar image. */
export function avatarGradient(seed: string): [string, string] {
  const palettes: [string, string][] = [
    ["#7c3aed", "#22d3ee"],
    ["#e11d48", "#f472b6"],
    ["#0891b2", "#a855f7"],
    ["#f59e0b", "#fb7185"],
    ["#059669", "#a3e635"],
    ["#6366f1", "#22d3ee"],
    ["#d946ef", "#38bdf8"],
    ["#14b8a6", "#6366f1"],
  ];
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return palettes[hash % palettes.length];
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function ageBadge(age: number | null): string {
  return age ? `${age}` : "Teen";
}
