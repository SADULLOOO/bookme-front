"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  Building2,
  Check,
  Crown,
  FileText,
  Layers,
  ShieldCheck,
  Star,
  Trash2,
  TrendingUp,
  Undo2,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { Textarea } from "@/components/ui/textarea";
import { GrowthChart } from "@/components/platform/growth-chart";
import { VerticalDonut, type DonutSegment } from "@/components/platform/vertical-donut";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useApi } from "@/lib/use-api";
import { API_URL, apiFetch, ApiError } from "@/lib/api";
import { useLocaleStore, LOCALE_INTL_TAG } from "@/lib/stores/locale-store";
import { useT, type TranslateFn } from "@/lib/i18n/use-t";
import { verticalMeta } from "@/lib/verticals";
import type { BusinessApplication, PlatformStats, PlatformUser } from "@/lib/types";

// One teal-forward palette, tint-shifted per vertical — matches the approved
// "Owner Analytics" reference exactly instead of a rainbow of unrelated hues.
const TEAL = "#2dd4a7";
const VERTICAL_COLORS: Record<string, string> = {
  barbershop: "#2dd4a7",
  beauty_salon: "#5eead4",
  clinic: "#14b8a6",
  spa: "#a7f3d0",
  fitness: "#0d9488",
  salon: "#2dd4a7",
};
const FALLBACK_COLORS = ["#2dd4a7", "#5eead4", "#14b8a6", "#a7f3d0", "#0d9488", "#99f6e4", "#134e4a"];

/** New-signups this month vs last, from a 6-point monthly series — an
 * honest count-based delta rather than a fabricated percentage. */
function monthOverMonthDelta(series: { month: string; count: number }[]): number | null {
  if (series.length < 2) return null;
  return series[series.length - 1].count;
}

function relativeTime(iso: string, t: TranslateFn) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return t("platform.justNow");
  if (mins < 60) return t("platform.minsAgo", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t("platform.hoursAgo", { n: hours });
  const days = Math.floor(hours / 24);
  return t("platform.daysAgo", { n: days });
}

export default function PlatformAdminPage() {
  return (
    <Suspense fallback={null}>
      <PlatformAdminPageInner />
    </Suspense>
  );
}

function PlatformAdminPageInner() {
  const t = useT();
  const intlTag = LOCALE_INTL_TAG[useLocaleStore((s) => s.locale)];
  const currentUser = useAuthStore((s) => s.user);
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "applications" ? "applications" : "overview";
  const [query, setQuery] = useState("");
  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: users, mutate: refreshUsers } = useApi<PlatformUser[]>(
    currentUser?.is_platform_admin ? `/platform/users${query ? `?q=${encodeURIComponent(query)}` : ""}` : null,
  );
  const { data: trashed, mutate: refreshTrash } = useApi<PlatformUser[]>(
    currentUser?.is_platform_admin ? "/platform/users/trash" : null,
  );
  const { data: stats } = useApi<PlatformStats>(currentUser?.is_platform_admin ? "/platform/stats" : null);
  const { data: allUsersForRecent } = useApi<PlatformUser[]>(currentUser?.is_platform_admin ? "/platform/users" : null);
  const { data: businessApplications, mutate: refreshApplications } = useApi<BusinessApplication[]>(
    currentUser?.is_platform_admin ? "/platform/applications/business" : null,
  );

  if (!currentUser?.is_platform_admin) {
    return <p className="text-sm text-sub">{t("platform.noAccess")}</p>;
  }

  async function handleApproveApplication(app: BusinessApplication) {
    try {
      await apiFetch(`/platform/applications/business/${app.id}/approve`, { method: "POST" });
      toast.success(t("platform.applicationApproved", { name: app.business_name }));
      refreshApplications();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    }
  }

  async function handleRejectApplication(app: BusinessApplication, reason: string) {
    try {
      await apiFetch(`/platform/applications/business/${app.id}/reject`, {
        method: "POST",
        body: { reason: reason.trim() || null },
      });
      toast.success(t("platform.applicationRejected", { name: app.business_name }));
      setRejectingAppId(null);
      setRejectReason("");
      refreshApplications();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    }
  }

  async function handleRemove(user: PlatformUser) {
    try {
      await apiFetch(`/platform/users/${user.id}`, { method: "DELETE" });
      toast.success(t("platform.movedToTrash", { name: user.full_name }));
      refreshUsers();
      refreshTrash();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("platform.removeUserFailed"));
    }
  }

  async function handleRestore(user: PlatformUser) {
    try {
      await apiFetch(`/platform/users/${user.id}/restore`, { method: "POST" });
      toast.success(t("platform.restored", { name: user.full_name }));
      refreshUsers();
      refreshTrash();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("platform.restoreFailed"));
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("platform.title")}</h1>
        <p className="text-[13px] text-sub">{t("platform.subtitle")}</p>
      </div>

      <Tabs defaultValue={initialTab}>
        <TabsList variant="line" className="mb-5">
          <TabsTrigger value="overview">{t("platform.tabOverview")}</TabsTrigger>
          <TabsTrigger value="applications">
            {t("platform.tabApplications")} {businessApplications ? `(${businessApplications.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="users">{t("platform.tabUsers")} {users ? `(${users.length})` : ""}</TabsTrigger>
          <TabsTrigger value="trash">{t("platform.tabTrash")} {trashed ? `(${trashed.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {!stats ? (
            <p className="text-sm text-sub">{t("common.loading")}</p>
          ) : (
            <PlatformOverview stats={stats} recentUsers={allUsersForRecent ?? []} />
          )}
        </TabsContent>

        <TabsContent value="applications">
          <div className="flex flex-col gap-2">
            {(businessApplications ?? []).map((app) => (
              <div key={app.id} className="glass flex flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-bold text-ink">{app.business_name}</div>
                    <div className="text-[11.5px] text-sub-2">
                      {t(verticalMeta(app.business_type).labelKey)} · {t("platform.appliedBy", { name: app.applicant_name })}
                    </div>
                  </div>
                  {app.contact_phone && (
                    <span className="shrink-0 font-mono text-[12px] text-sub">{app.contact_phone}</span>
                  )}
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-bold tracking-wide text-sub-2 uppercase">
                    {t("members.cvLabel")}
                  </div>
                  {app.cv_url ? (
                    <a
                      href={`${API_URL}${app.cv_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-fill px-3 py-1.5 text-[12.5px] font-semibold text-brand transition-colors hover:bg-glass-fill-strong"
                    >
                      <FileText className="size-3.5" /> {t("members.viewCv")}
                    </a>
                  ) : (
                    <p className="text-[12.5px] text-sub-2">{t("members.noCv")}</p>
                  )}
                  {app.experience && (
                    <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink">{app.experience}</p>
                  )}
                </div>
                {rejectingAppId === app.id ? (
                  <div className="flex flex-col gap-2">
                    <Textarea
                      autoFocus
                      rows={2}
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder={t("members.rejectReasonPlaceholder")}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleRejectApplication(app, rejectReason)}
                        className="flex items-center gap-1.5 rounded-full bg-destructive px-3.5 py-1.5 text-[12px] font-bold text-white"
                      >
                        {t("members.confirmReject")}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingAppId(null);
                          setRejectReason("");
                        }}
                        className="flex items-center gap-1.5 rounded-full border border-glass-border px-3.5 py-1.5 text-[12px] font-bold text-sub"
                      >
                        {t("common.cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleApproveApplication(app)}
                      className="flex items-center gap-1.5 rounded-full bg-brand px-3.5 py-1.5 text-[12px] font-bold text-brand-ink"
                    >
                      <Check className="size-3.5" /> {t("members.accept")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setRejectingAppId(app.id)}
                      className="flex items-center gap-1.5 rounded-full border border-glass-border px-3.5 py-1.5 text-[12px] font-bold text-sub"
                    >
                      <X className="size-3.5" /> {t("members.reject")}
                    </button>
                  </div>
                )}
              </div>
            ))}
            {businessApplications && businessApplications.length === 0 && (
              <div className="glass flex flex-col items-center gap-2 p-10 text-center">
                <p className="text-sm text-sub">{t("platform.noApplications")}</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="glass mb-4 flex items-center gap-2 px-3.5 py-2.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("platform.searchByNameEmail")}
              className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-sub-2"
            />
          </div>
          <div className="flex flex-col gap-2">
            {(users ?? []).map((u) => (
              <div key={u.id} className="glass flex items-center gap-3 px-4 py-3">
                <UserAvatar name={u.full_name} avatarUrl={u.avatar_url} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 truncate text-[13.5px] font-bold text-ink">
                    {u.full_name}
                    {u.is_platform_admin && <ShieldCheck className="size-3.5 shrink-0 text-brand" />}
                  </div>
                  <div className="truncate text-[11.5px] text-sub-2">{u.email}</div>
                </div>
                <span className="shrink-0 text-[11px] text-sub-2">
                  {t("platform.joined", { date: new Date(u.created_at).toLocaleDateString(intlTag) })}
                </span>
                {!u.is_platform_admin && u.id !== currentUser.id && (
                  <AlertDialog>
                    <AlertDialogTrigger className="flex size-8 shrink-0 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10">
                      <Trash2 className="size-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("platform.removeUserTitle", { name: u.full_name })}</AlertDialogTitle>
                        <AlertDialogDescription>{t("platform.removeUserBody")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemove(u)}>{t("platform.moveToTrash")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            ))}
            {users && users.length === 0 && <p className="py-8 text-center text-sm text-sub">{t("platform.noUsersMatch")}</p>}
          </div>
        </TabsContent>

        <TabsContent value="trash">
          <div className="flex flex-col gap-2">
            {(trashed ?? []).map((u) => (
              <div key={u.id} className="glass flex items-center gap-3 px-4 py-3 opacity-75">
                <UserAvatar name={u.full_name} avatarUrl={u.avatar_url} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-ink">{u.full_name}</div>
                  <div className="truncate text-[11.5px] text-sub-2">{u.email}</div>
                </div>
                <span className="shrink-0 text-[11px] text-sub-2">
                  {t("platform.removed", { date: u.deleted_at ? new Date(u.deleted_at).toLocaleDateString(intlTag) : "" })}
                </span>
                <button
                  type="button"
                  onClick={() => handleRestore(u)}
                  className="flex items-center gap-1.5 rounded-full border border-glass-border px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-glass-fill-strong"
                >
                  <Undo2 className="size-3.5" /> {t("platform.restore")}
                </button>
              </div>
            ))}
            {trashed && trashed.length === 0 && (
              <div className="glass flex flex-col items-center gap-2 p-10 text-center">
                <p className="text-sm text-sub">{t("platform.trashEmpty")}</p>
                <p className="text-[12px] text-sub-2">{t("platform.trashEmptyBody")}</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlatformOverview({ stats, recentUsers }: { stats: PlatformStats; recentUsers: PlatformUser[] }) {
  const t = useT();
  const byBusinessType = stats.by_business_type ?? {};
  const topBusinesses = stats.top_businesses ?? [];
  const userGrowth = stats.user_growth ?? [];
  const businessGrowth = stats.business_growth ?? [];
  const verticalEntries = Object.entries(byBusinessType).sort((a, b) => b[1] - a[1]);
  const donutSegments: DonutSegment[] = verticalEntries.map(([value], i) => ({
    label: t(verticalMeta(value).labelKey),
    value: byBusinessType[value],
    color: VERTICAL_COLORS[value] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));
  const recent = recentUsers
    .slice()
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 5);
  const userDelta = monthOverMonthDelta(userGrowth);
  const businessDelta = monthOverMonthDelta(businessGrowth);

  return (
    <div>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={UsersIcon}
          label={t("platform.totalUsers")}
          value={stats.total_users}
          color={TEAL}
          delta={userDelta != null ? t("platform.thisMonthDelta", { n: userDelta }) : undefined}
        />
        <StatTile
          icon={Building2}
          label={t("platform.businesses")}
          value={stats.total_businesses}
          color={TEAL}
          delta={businessDelta != null ? t("platform.thisMonthDelta", { n: businessDelta }) : undefined}
        />
        <StatTile icon={Crown} label={t("platform.businessOwners")} value={stats.total_owners} color={TEAL} />
        <StatTile icon={Layers} label={t("platform.verticalsSupported")} value={verticalEntries.length} color={TEAL} />
      </div>

      <div className="glass mb-4 p-5 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-[14px] font-bold text-ink">{t("platform.platformGrowth")}</h3>
          <span className="rounded-full border border-glass-border px-2.5 py-1 font-mono text-[10px] text-sub-2">
            {t("platform.last6Months")}
          </span>
        </div>
        <GrowthChart data={userGrowth} color={TEAL} total={stats.total_users} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="glass p-5">
          <h3 className="mb-4 font-display text-[14px] font-bold text-ink">{t("platform.businessesByVertical")}</h3>
          {donutSegments.length > 0 ? (
            <VerticalDonut segments={donutSegments} />
          ) : (
            <p className="text-sm text-sub">{t("platform.noBusinessesYet")}</p>
          )}
        </div>

        <div className="glass p-5">
          <h3 className="mb-4 font-display text-[14px] font-bold text-ink">{t("platform.topBusinesses")}</h3>
          <div className="flex flex-col gap-3">
            {topBusinesses.map((b, i) => (
              <a
                key={b.slug}
                href={`/${b.slug}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 rounded-lg transition-colors hover:bg-glass-fill"
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold"
                  style={{ background: `color-mix(in srgb, ${TEAL} 16%, transparent)`, color: TEAL }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{b.name}</div>
                  <div className="text-[11px] text-sub-2">{t(verticalMeta(b.business_type).labelKey)}</div>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-[12px] font-semibold text-ink">
                  <Star className="size-3 fill-avail-3 text-avail-3" />
                  {b.average_rating.toFixed(1)}
                </span>
              </a>
            ))}
            {topBusinesses.length === 0 && <p className="text-sm text-sub">{t("platform.noRatedBusinessesYet")}</p>}
          </div>
        </div>

        <div className="glass p-5">
          <h3 className="mb-4 font-display text-[14px] font-bold text-ink">{t("platform.recentSignups")}</h3>
          <div className="flex flex-col gap-3">
            {recent.map((u) => (
              <div key={u.id} className="flex items-center gap-2.5">
                <UserAvatar name={u.full_name} avatarUrl={u.avatar_url} size={30} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{u.full_name}</div>
                </div>
                <span className="shrink-0 text-[11px] text-sub-2">{relativeTime(u.created_at, t)}</span>
              </div>
            ))}
            {recent.length === 0 && <p className="text-sm text-sub">{t("platform.noSignupsYet")}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  color,
  delta,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: number;
  color: string;
  delta?: string;
}) {
  return (
    <div className="glass p-4">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[11.5px] text-sub">{label}</span>
        <span
          className="flex size-6 items-center justify-center rounded-full"
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <div className="font-mono text-2xl font-bold text-ink">{value}</div>
      {delta && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold" style={{ color: TEAL }}>
          <TrendingUp className="size-3" />
          {delta}
        </div>
      )}
    </div>
  );
}
