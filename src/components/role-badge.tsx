"use client";

import { EMOJI_FONT_STACK, ROLE_META } from "@/lib/role-meta";
import { useT } from "@/lib/i18n/use-t";
import type { MembershipRole } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RoleBadge({
  role,
  className,
  withLabel = false,
}: {
  role: MembershipRole;
  className?: string;
  withLabel?: boolean;
}) {
  const t = useT();
  const meta = ROLE_META[role];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[12px] font-bold",
        role === "owner" && "text-brand",
        role === "admin" && "text-avail-2",
        role === "staff" && "text-avail",
        role === "client" && "text-sub",
        className,
      )}
    >
      <span style={{ fontFamily: EMOJI_FONT_STACK }} className="text-[13px] leading-none">
        {meta.emoji}
      </span>
      {withLabel && t(`role.${role}`)}
    </span>
  );
}

export function RoleBadgeDot({ role, className }: { role: MembershipRole; className?: string }) {
  const t = useT();
  const meta = ROLE_META[role];
  return (
    <span
      title={t(`role.${role}`)}
      style={{ fontFamily: EMOJI_FONT_STACK }}
      className={cn(
        "absolute -right-1 -bottom-1 flex h-[15px] w-[15px] items-center justify-center rounded-full border text-[9px] leading-none shadow-sm",
        "bg-bg-1",
        role === "owner" && "border-brand/55",
        role === "admin" && "border-avail-2/55",
        role === "staff" && "border-avail/55",
        role === "client" && "border-glass-border-strong",
        className,
      )}
    >
      {meta.emoji}
    </span>
  );
}
