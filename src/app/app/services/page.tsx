"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { Pencil, Plus, Scissors, Tags } from "lucide-react";
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
import { ServiceFormDialog } from "@/components/service-form-dialog";
import { ServiceCategoriesDialog } from "@/components/service-categories-dialog";
import { useActiveOrg } from "@/lib/stores/org-store";
import { useApi } from "@/lib/use-api";
import { apiFetch, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { Branch, Service, ServiceCategory, StaffMember, StaffServiceLink } from "@/lib/types";

export default function ServicesPage() {
  const t = useT();
  const activeOrg = useActiveOrg();
  const orgId = activeOrg?.id ?? null;
  const canManage = activeOrg?.role === "owner" || activeOrg?.role === "admin";

  const { data: branches } = useApi<Branch[]>(orgId ? `/organizations/${orgId}/branches` : null);
  const { data: services, mutate: refreshServices } = useApi<Service[]>(orgId ? `/organizations/${orgId}/services` : null);
  const { data: staffList } = useApi<StaffMember[]>(orgId ? `/organizations/${orgId}/staff` : null);
  const { data: categories, mutate: refreshCategories } = useApi<ServiceCategory[]>(
    orgId ? `/organizations/${orgId}/service-categories` : null,
  );

  const staffIdsKey = useMemo(() => (staffList ?? []).map((s) => s.id).sort().join(","), [staffList]);
  const {
    data: assignments,
    mutate: refreshAssignments,
  } = useSWR(
    orgId && staffList ? ["staff-services", orgId, staffIdsKey] : null,
    async () => {
      const entries = await Promise.all(
        (staffList ?? []).map(async (s) => {
          const links = await apiFetch<StaffServiceLink[]>(`/organizations/${orgId}/staff/${s.id}/services`);
          return [s.id, new Set(links.map((l) => l.service_id))] as const;
        }),
      );
      return Object.fromEntries(entries) as Record<string, Set<string>>;
    },
  );

  if (!activeOrg) return null;
  if (!canManage) {
    return <p className="text-sm text-sub">{t("services.noAccess")}</p>;
  }

  const branchName = (id: string | null) => branches?.find((b) => b.id === id)?.name ?? "—";
  const categoryName = (id: string | null) => (id ? categories?.find((c) => c.id === id)?.name ?? null : null);

  async function handleDeactivate(service: Service) {
    if (!orgId) return;
    try {
      await apiFetch(`/organizations/${orgId}/services/${service.id}`, { method: "DELETE" });
      toast.success(t("services.deactivated", { name: service.name }));
      refreshServices();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("services.deactivateFailed"));
    }
  }

  async function toggleAssignment(staffId: string, serviceId: string, currentlyAssigned: boolean) {
    if (!orgId) return;
    try {
      if (currentlyAssigned) {
        await apiFetch(`/organizations/${orgId}/staff/${staffId}/services/${serviceId}`, { method: "DELETE" });
      } else {
        await apiFetch(`/organizations/${orgId}/staff/${staffId}/services/${serviceId}`, { method: "POST", body: {} });
      }
      refreshAssignments();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("services.assignFailed"));
    }
  }

  const activeServices = (services ?? []).filter((s) => s.is_active);
  const inactiveServices = (services ?? []).filter((s) => !s.is_active);

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("services.title")}</h1>
          <p className="text-[13px] text-sub">{t("services.subtitle", { org: activeOrg.name })}</p>
        </div>
        {orgId && (
          <div className="flex shrink-0 items-center gap-2">
            <ServiceCategoriesDialog
              organizationId={orgId}
              categories={categories ?? []}
              onChanged={() => refreshCategories()}
              trigger={
                <span className="flex cursor-pointer items-center gap-1.5 rounded-full border border-glass-border bg-glass-fill px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-glass-fill-strong">
                  <Tags className="size-3.5" />
                  {t("serviceCategories.manageButton")}
                </span>
              }
            />
            <ServiceFormDialog
              organizationId={orgId}
              branches={branches ?? []}
              categories={categories ?? []}
              onSaved={() => refreshServices()}
              trigger={
                <span className="flex cursor-pointer items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[13px] font-bold text-brand-ink transition-transform hover:scale-[1.03]">
                  <Plus className="size-3.5" />
                  {t("services.addService")}
                </span>
              }
            />
          </div>
        )}
      </div>

      {activeServices.length === 0 && inactiveServices.length === 0 && (
        <div className="glass flex flex-col items-center gap-2 p-10 text-center">
          <Scissors className="size-6 text-sub-2" />
          <p className="text-sm text-sub">{t("services.noServices")}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {activeServices.map((service) => (
          <div key={service.id} className="glass flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div className="text-[14.5px] font-bold text-ink">{service.name}</div>
                  {categoryName(service.category_id) && (
                    <span className="rounded-full bg-glass-fill-strong px-2 py-0.5 text-[10.5px] font-semibold text-sub">
                      {categoryName(service.category_id)}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[12px] text-sub-2">
                  {branchName(service.branch_id)} · {service.duration_minutes} {t("common.min")} · {service.price} {service.currency}
                  {service.deposit_amount != null && ` · ${t("services.depositBadge", { amount: String(service.deposit_amount) })}`}
                </div>
                {service.description && <p className="mt-1.5 text-[12.5px] text-sub">{service.description}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {orgId && (
                  <ServiceFormDialog
                    organizationId={orgId}
                    branches={branches ?? []}
                    categories={categories ?? []}
                    service={service}
                    onSaved={() => refreshServices()}
                    trigger={
                      <span
                        className="flex size-8 cursor-pointer items-center justify-center rounded-lg text-sub transition-colors hover:bg-glass-fill-strong hover:text-ink"
                        aria-label={t("services.editService")}
                      >
                        <Pencil className="size-3.5" />
                      </span>
                    }
                  />
                )}
                <AlertDialog>
                  <AlertDialogTrigger className="rounded-full border border-glass-border bg-glass-fill px-3 py-1.5 text-[12px] font-semibold text-destructive transition-colors hover:bg-destructive/10">
                    {t("services.deactivate")}
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("services.deactivateTitle", { name: service.name })}</AlertDialogTitle>
                      <AlertDialogDescription>{t("services.deactivateBody")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeactivate(service)}>
                        {t("services.deactivate")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="border-t border-glass-border pt-3">
              <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-sub-2">
                {t("services.assignedStaffLabel")}
              </p>
              {staffList && staffList.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {staffList.map((staff) => {
                    const assigned = assignments?.[staff.id]?.has(service.id) ?? false;
                    return (
                      <button
                        key={staff.id}
                        type="button"
                        onClick={() => toggleAssignment(staff.id, service.id, assigned)}
                        className={cn(
                          "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[12px] font-semibold transition-colors",
                          assigned
                            ? "border-transparent bg-brand text-brand-ink"
                            : "border-glass-border bg-glass-fill text-sub hover:text-ink",
                        )}
                      >
                        <UserAvatar name={staff.full_name} avatarUrl={staff.avatar_url} size={18} />
                        {staff.full_name}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[12.5px] text-sub-2">{t("services.noStaffToAssign")}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {inactiveServices.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-sub-2">{t("services.inactiveLabel")}</p>
          <div className="flex flex-col gap-2">
            {inactiveServices.map((service) => (
              <div key={service.id} className="glass flex items-center justify-between gap-3 px-4 py-3 opacity-60">
                <div className="min-w-0 text-[13.5px] font-semibold text-ink">{service.name}</div>
                <span className="text-[11.5px] text-sub-2">{t("services.inactiveBadge")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
