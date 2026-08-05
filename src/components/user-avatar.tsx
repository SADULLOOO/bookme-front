import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RoleBadgeDot } from "@/components/role-badge";
import type { MembershipRole } from "@/lib/types";
import { cn } from "@/lib/utils";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function UserAvatar({
  name,
  avatarUrl,
  role,
  size = 28,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  role?: MembershipRole;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      <Avatar style={{ width: size, height: size }}>
        <AvatarImage src={avatarUrl ?? undefined} alt={name} />
        <AvatarFallback
          className="text-white"
          style={{ background: "linear-gradient(135deg, var(--mesh-a), var(--mesh-c))" }}
        >
          <span style={{ fontSize: Math.max(9, size * 0.34) }}>{initials(name) || "?"}</span>
        </AvatarFallback>
      </Avatar>
      {role && <RoleBadgeDot role={role} />}
    </span>
  );
}
