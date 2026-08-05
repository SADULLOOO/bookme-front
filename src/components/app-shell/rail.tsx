"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  CalendarDays,
  Clock,
  Home,
  LayoutDashboard,
  LogOut,
  MessageCircle,
  Scissors,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import styles from "./app-shell.module.css";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useActiveOrg, useOrgStore } from "@/lib/stores/org-store";
import { UserAvatar } from "@/components/user-avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/lib/i18n/use-t";
import type { MembershipRole } from "@/lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  roles: MembershipRole[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/app/home", labelKey: "nav.home", icon: Home, roles: ["client", "staff", "admin", "owner"] },
  { href: "/app/ai", labelKey: "nav.ai", icon: Sparkles, roles: ["client", "staff", "admin", "owner"] },
  { href: "/app/dashboard", labelKey: "nav.dashboard", icon: LayoutDashboard, roles: ["staff", "admin", "owner"] },
  { href: "/app/bookings", labelKey: "nav.myBookings", icon: CalendarDays, roles: ["client"] },
  { href: "/app/chat", labelKey: "nav.chat", icon: MessageCircle, roles: ["client", "staff", "admin", "owner"] },
  { href: "/app/members", labelKey: "nav.members", icon: Users, roles: ["admin", "owner"] },
  { href: "/app/services", labelKey: "nav.services", icon: Scissors, roles: ["admin", "owner"] },
  { href: "/app/schedule", labelKey: "nav.schedule", icon: Clock, roles: ["staff", "admin", "owner"] },
  { href: "/app/profile", labelKey: "nav.profile", icon: UserRound, roles: ["client"] },
];

export function Rail() {
  const t = useT();
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const organizations = useOrgStore((s) => s.organizations);
  const setActiveOrgId = useOrgStore((s) => s.setActiveOrgId);
  const activeOrg = useActiveOrg();

  const role: MembershipRole = activeOrg?.role ?? "client";
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  // theme is undefined until next-themes mounts, so this naturally matches
  // the server render (false) on first paint — no hydration mismatch.
  const isDark = theme === "dark";

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <aside className={cn("glass", styles.rail)}>
      <Link href="/app/home" className={styles.brand}>
        <span className={styles.brandDot} />
        BookMe
      </Link>

      <nav className={styles.nav}>
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(styles.navButton, active && styles.navButtonActive)}
            >
              <Icon />
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
        {user?.is_platform_admin && (
          <Link
            href="/app/platform"
            className={cn(
              styles.navButton,
              pathname?.startsWith("/app/platform") && styles.navButtonActive,
            )}
          >
            <ShieldCheck />
            <span>{t("nav.platform")}</span>
          </Link>
        )}
      </nav>

      <div className={cn(styles.toggleRow, "justify-between")}>
        <span>{t("platform.notifications")}</span>
        <NotificationBell />
      </div>

      <div className={cn(styles.toggleRow, "justify-between")}>
        <span>{t("language.label")}</span>
        <LanguageSwitcher side="right" align="start" />
      </div>

      <button
        type="button"
        className={styles.toggleRow}
        onClick={() => setTheme(isDark ? "light" : "dark")}
      >
        <span className={styles.toggleIcon}>{isDark ? "🌙" : "☀️"}</span>
        <span>{isDark ? t("nav.darkTheme") : t("nav.lightTheme")}</span>
      </button>

      <div className={styles.spacer} />

      <div className={styles.foot}>
        <DropdownMenu>
          <DropdownMenuTrigger className={styles.userChip}>
            <UserAvatar name={user?.full_name ?? "..."} avatarUrl={user?.avatar_url} role={role} />
            <span className="min-w-0">
              <span className={cn(styles.userName, "block")}>{user?.full_name ?? "…"}</span>
              <span className={styles.userRole}>
                {ROLE_EMOJI[role]} {t(`role.${role}`)}
              </span>
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            {organizations.length > 1 && (
              <>
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{t("nav.switchBusiness")}</DropdownMenuLabel>
                  {organizations.map((org) => (
                    <DropdownMenuItem key={org.id} onClick={() => setActiveOrgId(org.id)}>
                      {ROLE_EMOJI[org.role]} {org.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut /> {t("nav.logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

const ROLE_EMOJI: Record<MembershipRole, string> = {
  owner: "👑",
  admin: "🛡️",
  staff: "💼",
  client: "🤝",
};

export { styles as railStyles };
