"use client";

import { toast } from "sonner";
import { ListPlus } from "lucide-react";
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
import { useActiveOrg } from "@/lib/stores/org-store";
import { useApi } from "@/lib/use-api";
import { apiFetch, ApiError } from "@/lib/api";
import { useLocaleStore, LOCALE_INTL_TAG } from "@/lib/stores/locale-store";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { Branch, Member, Service, StaffMember, WaitlistEntry, WaitlistStatus } from "@/lib/types";

const STATUS_STYLES: Record<WaitlistStatus, string> = {
  waiting: "bg-avail-3/15 text-avail-3",
  notified: "bg-avail/15 text-avail",
  converted: "bg-glass-fill-strong text-sub",
  cancelled: "bg-destructive/10 text-destructive",
};

export default function WaitlistPage() {
  const t = useT();
  const intlTag = LOCALE_INTL_TAG[useLocaleStore((s) => s.locale)];
  const activeOrg = useActiveOrg();
  const orgId = activeOrg?.id ?? null;
  const canManage = activeOrg?.role === "owner" || activeOrg?.role === "admin";

  const { data: entries, mutate: refreshEntries } = useApi<WaitlistEntry[]>(
    orgId && canManage ? `/organizations/${orgId}/waitlist` : null,
  );
  const { data: branches } = useApi<Branch[]>(orgId && canManage ? `/organizations/${orgId}/branches` : null);
  const { data: services } = useApi<Service[]>(orgId && canManage ? `/organizations/${orgId}/services` : null);
  const { data: staff } = useApi<StaffMember[]>(orgId && canManage ? `/organizations/${orgId}/staff` : null);
  const { data: members } = useApi<Member[]>(orgId && canManage ? `/organizations/${orgId}/members` : null);

  if (!activeOrg) return null;
  if (!canManage) {
    return <p className="text-sm text-sub">{t("waitlist.noAccess")}</p>;
  }

  const branchName = (id: string) => branches?.find((b) => b.id === id)?.name ?? "—";
  const serviceName = (id: string) => services?.find((s) => s.id === id)?.name ?? "—";
  const staffName = (id: string | null) => (id ? staff?.find((s) => s.id === id)?.full_name ?? "—" : t("waitlist.anyStaff"));
  const clientName = (id: string) => members?.find((m) => m.user_id === id)?.full_name ?? "—";

  async function handleRemove(entry: WaitlistEntry) {
    if (!orgId) return;
    try {
      await apiFetch(`/organizations/${orgId}/waitlist/${entry.id}`, { method: "DELETE" });
      toast.success(t("waitlist.removed"));
      refreshEntries();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("waitlist.removeFailed"));
    }
  }

  const active = (entries ?? [])
    .filter((e) => e.status === "waiting" || e.status === "notified")
    .sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const history = (entries ?? [])
    .filter((e) => e.status === "converted" || e.status === "cancelled")
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("waitlist.title")}</h1>
        <p className="text-[13px] text-sub">{t("waitlist.subtitle", { org: activeOrg.name })}</p>
      </div>

      {active.length === 0 && (
        <div className="glass flex flex-col items-center gap-2 p-10 text-center">
          <ListPlus className="size-6 text-sub-2" />
          <p className="text-sm text-sub">{t("waitlist.noEntries")}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {active.map((entry) => (
          <div key={entry.id} className="glass flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="text-[14px] font-bold text-ink">{clientName(entry.client_id)}</div>
              <div className="mt-0.5 text-[12px] text-sub-2">
                {serviceName(entry.service_id)} · {branchName(entry.branch_id)} · {staffName(entry.staff_id)}
              </div>
              <div className="mt-0.5 font-mono text-[11.5px] text-sub-2">
                {new Date(entry.date).toLocaleDateString(intlTag, { month: "short", day: "numeric", year: "numeric" })}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold capitalize", STATUS_STYLES[entry.status])}>
                {t(`waitlist.status.${entry.status}`)}
              </span>
              <AlertDialog>
                <AlertDialogTrigger className="rounded-full border border-glass-border bg-glass-fill px-3 py-1.5 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/10">
                  {t("waitlist.remove")}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("waitlist.removeTitle", { name: clientName(entry.client_id) })}</AlertDialogTitle>
                    <AlertDialogDescription>{t("waitlist.removeBody")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleRemove(entry)}>{t("waitlist.remove")}</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-sub-2">{t("waitlist.historyLabel")}</p>
          <div className="flex flex-col gap-2">
            {history.map((entry) => (
              <div key={entry.id} className="glass flex items-center justify-between gap-3 px-4 py-3 opacity-60">
                <div className="min-w-0 text-[13px] font-semibold text-ink">
                  {clientName(entry.client_id)} · {serviceName(entry.service_id)}
                </div>
                <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold capitalize", STATUS_STYLES[entry.status])}>
                  {t(`waitlist.status.${entry.status}`)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
