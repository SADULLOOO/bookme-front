"use client";

import { toast } from "sonner";
import { MapPin, Pencil, Plus } from "lucide-react";
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
import { BranchFormDialog } from "@/components/branch-form-dialog";
import { useActiveOrg } from "@/lib/stores/org-store";
import { useApi } from "@/lib/use-api";
import { apiFetch, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";
import type { Branch } from "@/lib/types";

export default function BranchesPage() {
  const t = useT();
  const activeOrg = useActiveOrg();
  const orgId = activeOrg?.id ?? null;
  const canManage = activeOrg?.role === "owner" || activeOrg?.role === "admin";

  const { data: branches, mutate: refreshBranches } = useApi<Branch[]>(orgId ? `/organizations/${orgId}/branches` : null);

  if (!activeOrg) return null;
  if (!canManage) {
    return <p className="text-sm text-sub">{t("branches.noAccess")}</p>;
  }

  const activeBranches = (branches ?? []).filter((b) => b.is_active);
  const inactiveBranches = (branches ?? []).filter((b) => !b.is_active);

  async function handleDeactivate(branch: Branch) {
    if (!orgId) return;
    try {
      await apiFetch(`/organizations/${orgId}/branches/${branch.id}`, { method: "DELETE" });
      toast.success(t("branches.deactivated", { name: branch.name }));
      refreshBranches();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("branches.deactivateFailed"));
    }
  }

  async function handleReactivate(branch: Branch) {
    if (!orgId) return;
    try {
      await apiFetch(`/organizations/${orgId}/branches/${branch.id}`, { method: "PATCH", body: { is_active: true } });
      toast.success(t("branches.reactivated", { name: branch.name }));
      refreshBranches();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("branches.reactivateFailed"));
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("branches.title")}</h1>
          <p className="text-[13px] text-sub">{t("branches.subtitle", { org: activeOrg.name })}</p>
        </div>
        {orgId && (
          <BranchFormDialog
            organizationId={orgId}
            onSaved={() => refreshBranches()}
            trigger={
              <span className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[13px] font-bold text-brand-ink transition-transform hover:scale-[1.03]">
                <Plus className="size-3.5" />
                {t("branches.addBranch")}
              </span>
            }
          />
        )}
      </div>

      {activeBranches.length === 0 && inactiveBranches.length === 0 && (
        <div className="glass flex flex-col items-center gap-2 p-10 text-center">
          <MapPin className="size-6 text-sub-2" />
          <p className="text-sm text-sub">{t("branches.noBranches")}</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {activeBranches.map((branch) => (
          <div key={branch.id} className="glass flex items-center justify-between gap-3 p-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-glass-fill-strong text-sub">
                <MapPin className="size-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[14.5px] font-bold text-ink">{branch.name}</div>
                <div className="mt-0.5 text-[12px] text-sub-2">
                  {branch.address || t("branches.noAddress")}
                  {branch.phone && ` · ${branch.phone}`} · {branch.timezone}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {orgId && (
                <BranchFormDialog
                  organizationId={orgId}
                  branch={branch}
                  onSaved={() => refreshBranches()}
                  trigger={
                    <span
                      className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-sub transition-colors hover:bg-glass-fill-strong hover:text-ink"
                      aria-label={t("branches.editBranch")}
                    >
                      <Pencil className="size-3.5" />
                    </span>
                  }
                />
              )}
              <AlertDialog>
                <AlertDialogTrigger className="rounded-full border border-glass-border bg-glass-fill px-3 py-1.5 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/10">
                  {t("branches.deactivate")}
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t("branches.deactivateTitle", { name: branch.name })}</AlertDialogTitle>
                    <AlertDialogDescription>{t("branches.deactivateBody")}</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeactivate(branch)}>
                      {t("branches.deactivate")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>

      {inactiveBranches.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-sub-2">{t("branches.inactiveLabel")}</p>
          <div className="flex flex-col gap-2">
            {inactiveBranches.map((branch) => (
              <div key={branch.id} className="glass flex items-center justify-between gap-3 px-4 py-3 opacity-60">
                <div className="min-w-0 text-[13.5px] font-semibold text-ink">{branch.name}</div>
                <button
                  type="button"
                  onClick={() => handleReactivate(branch)}
                  className="shrink-0 rounded-full border border-glass-border bg-glass-fill px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-glass-fill-strong"
                >
                  {t("branches.reactivate")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
