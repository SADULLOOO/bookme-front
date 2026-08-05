"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ArchiveRestore, Search, Trash2, UserPlus, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { RoleBadge } from "@/components/role-badge";
import { AddStaffDialog } from "@/components/add-staff-dialog";
import { StaffApplicationsPanel } from "@/components/staff-applications-panel";
import { useActiveOrg } from "@/lib/stores/org-store";
import { useApi } from "@/lib/use-api";
import { apiFetch, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { Member, MembershipRole } from "@/lib/types";

const ROLE_OPTIONS: MembershipRole[] = ["owner", "admin", "staff", "client"];
const FILTERS: ("all" | MembershipRole)[] = ["all", "owner", "admin", "staff", "client"];

export default function MembersPage() {
  const t = useT();
  const activeOrg = useActiveOrg();
  const orgId = activeOrg?.id ?? null;
  const isOwner = activeOrg?.role === "owner";
  const canManage = isOwner || activeOrg?.role === "admin";
  const { data: members, mutate: refresh } = useApi<Member[]>(orgId ? `/organizations/${orgId}/members` : null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | MembershipRole>("all");
  const [view, setView] = useState<"active" | "removed">("active");

  if (!activeOrg) return null;

  const activeMembers = (members ?? []).filter((m) => m.is_active);
  const removedMembers = (members ?? []).filter((m) => !m.is_active);
  const source = view === "active" ? activeMembers : removedMembers;

  const filtered = source.filter((m) => {
    if (view === "active" && filter !== "all" && m.role !== filter) return false;
    if (query && !`${m.full_name} ${m.email}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });

  async function handleRoleChange(member: Member, role: MembershipRole) {
    if (!orgId || role === member.role) return;
    try {
      await apiFetch(`/organizations/${orgId}/members/${member.id}`, { method: "PATCH", body: { role } });
      toast.success(t("members.roleUpdated", { name: member.full_name, role: t(`role.${role}`) }));
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("members.roleUpdateFailed"));
    }
  }

  async function handleRemove(member: Member) {
    if (!orgId) return;
    try {
      await apiFetch(`/organizations/${orgId}/members/${member.id}`, { method: "DELETE" });
      toast.success(t("members.removed", { name: member.full_name }));
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("members.removeFailed"));
    }
  }

  async function handleRestore(member: Member) {
    if (!orgId) return;
    try {
      await apiFetch(`/organizations/${orgId}/members/${member.id}/restore`, { method: "POST" });
      toast.success(t("members.restored", { name: member.full_name }));
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("members.restoreFailed"));
    }
  }

  async function handlePermanentDelete(member: Member) {
    if (!orgId) return;
    try {
      await apiFetch(`/organizations/${orgId}/members/${member.id}/permanent`, { method: "DELETE" });
      toast.success(t("members.permanentlyDeleted", { name: member.full_name }));
      refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("members.permanentDeleteFailed"));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("members.title")}</h1>
          <p className="text-[13px] text-sub">{t("members.count", { count: activeMembers.length, org: activeOrg.name })}</p>
        </div>
        {canManage && orgId && (
          <AddStaffDialog
            organizationId={orgId}
            onAdded={() => refresh()}
            trigger={
              <span className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[13px] font-bold text-brand-ink transition-transform hover:scale-[1.03]">
                <UserPlus className="size-3.5" />
                {t("members.addStaff")}
              </span>
            }
          />
        )}
      </div>

      {canManage && orgId && <StaffApplicationsPanel organizationId={orgId} onHandled={refresh} />}

      {isOwner && removedMembers.length > 0 && (
        <div className="mb-4 flex gap-1.5">
          <button
            type="button"
            onClick={() => setView("active")}
            className={cn(
              "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
              view === "active"
                ? "border-transparent bg-brand text-brand-ink"
                : "border-glass-border bg-glass-fill text-sub hover:text-ink",
            )}
          >
            {t("members.viewActive")}
          </button>
          <button
            type="button"
            onClick={() => setView("removed")}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
              view === "removed"
                ? "border-transparent bg-brand text-brand-ink"
                : "border-glass-border bg-glass-fill text-sub hover:text-ink",
            )}
          >
            {t("members.viewRemoved")} ({removedMembers.length})
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <div className="glass flex min-w-[200px] flex-1 items-center gap-2 px-3.5 py-2.5">
          <Search className="size-4 shrink-0 text-sub-2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("members.searchPlaceholder")}
            className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-sub-2"
          />
        </div>
        {view === "active" && (
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full border px-3.5 py-2 text-xs font-semibold capitalize transition-colors",
                  f === filter
                    ? "border-transparent bg-brand text-brand-ink"
                    : "border-glass-border bg-glass-fill text-sub hover:text-ink",
                )}
              >
                {t(`members.filter.${f}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {filtered.map((member) => (
          <div key={member.id} className={cn("glass flex items-center gap-3 px-4 py-3", view === "removed" && "opacity-70")}>
            <UserAvatar name={member.full_name} role={member.role} size={32} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13.5px] font-bold text-ink">{member.full_name}</div>
              <div className="truncate text-[11.5px] text-sub-2">{member.email}</div>
            </div>
            {view === "active" ? (
              <>
                <Select
                  value={member.role}
                  onValueChange={(role) => handleRoleChange(member, role as MembershipRole)}
                >
                  <SelectTrigger className="w-[132px] border-glass-border bg-glass-fill">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        <RoleBadge role={r} withLabel />
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isOwner && (
                  <AlertDialog>
                    <AlertDialogTrigger className="flex size-8 shrink-0 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10">
                      <Trash2 className="size-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("members.removeTitle", { name: member.full_name })}</AlertDialogTitle>
                        <AlertDialogDescription>{t("members.removeBody")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleRemove(member)}>{t("members.remove")}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            ) : (
              isOwner && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleRestore(member)}
                    className="flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-fill px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-glass-fill-strong"
                  >
                    <ArchiveRestore className="size-3.5" /> {t("members.restore")}
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger className="flex size-8 shrink-0 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10">
                      <XCircle className="size-4" />
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("members.permanentDeleteTitle", { name: member.full_name })}</AlertDialogTitle>
                        <AlertDialogDescription>{t("members.permanentDeleteBody")}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handlePermanentDelete(member)}>
                          {t("members.permanentDeleteConfirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )
            )}
          </div>
        ))}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-sub">{t("members.noMatch")}</p>}
      </div>
    </div>
  );
}
