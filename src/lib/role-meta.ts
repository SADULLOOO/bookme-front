import type { MembershipRole } from "@/lib/types";

export const ROLE_META: Record<MembershipRole, { emoji: string }> = {
  owner: { emoji: "👑" },
  admin: { emoji: "🛡️" },
  staff: { emoji: "💼" },
  client: { emoji: "🤝" },
};

/** Real Unicode emoji, not icon-font glyphs — prioritizes each OS's native color emoji font. */
export const EMOJI_FONT_STACK =
  '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
