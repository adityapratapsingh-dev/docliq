import type { AccentKey, MessageScope, PostType, ReactionType } from "@/types/cliq";

export const FLAIRS: { label: string; color: string }[] = [
  { label: "#AskCliq", color: "#8b5cf6" },
  { label: "#SchoolLife", color: "#38bdf8" },
  { label: "#Gaming", color: "#22c55e" },
  { label: "#Music", color: "#f472b6" },
  { label: "#LateNightThoughts", color: "#6366f1" },
  { label: "#Memes", color: "#f59e0b" },
];

export const INTEREST_OPTIONS = [
  "Gaming",
  "Music",
  "Anime",
  "Coding",
  "Fitness",
  "Art",
  "Movies",
  "Memes",
] as const;

export const INTEREST_FILTERS = ["All Vibes", ...INTEREST_OPTIONS];

export const MESSAGE_REACTIONS = ["❤️", "🔥", "😂", "⚡", "👍", "👎"];

export const EMOJI_QUICKBAR = ["😂", "🔥", "❤️", "⚡", "👍", "🎧", "🎮", "✨"];

export const ACCENT_KEYS: AccentKey[] = ["violet", "cyan", "rose", "emerald"];

export const MESSAGE_SCOPES: { key: MessageScope; label: string }[] = [
  { key: "everyone", label: "Everyone" },
  { key: "shared", label: "Shared Interests Only" },
  { key: "friends", label: "Cliq Friends Only" },
];

export function flairColor(label: string | null | undefined): string {
  if (!label) return "#8b5cf6";
  return FLAIRS.find((f) => f.label === label)?.color ?? "#8b5cf6";
}

export function postTypeLabel(type: PostType): string {
  if (type === "video") return "Video";
  if (type === "photo") return "Photo";
  return "Chat Post";
}

export const POST_TYPES: PostType[] = ["video", "photo", "chat"];

export const REACTIONS: ReactionType[] = ["like", "dislike", "upgrade", "downgrade"];
