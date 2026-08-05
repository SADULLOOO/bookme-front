"use client";

import { useState } from "react";
import { WorkingHoursEditor } from "@/components/working-hours-editor";
import { UserAvatar } from "@/components/user-avatar";
import { useActiveOrg } from "@/lib/stores/org-store";
import { useApi } from "@/lib/use-api";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { StaffMember } from "@/lib/types";

export default function SchedulePage() {
  const t = useT();
  const activeOrg = useActiveOrg();
  const orgId = activeOrg?.id ?? null;
  const isManager = activeOrg?.role === "owner" || activeOrg?.role === "admin";
  const isStaff = activeOrg?.role === "staff";

  const { data: staffList } = useApi<StaffMember[]>(isManager && orgId ? `/organizations/${orgId}/staff` : null);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);

  if (!activeOrg) return null;

  if (isStaff) {
    if (!activeOrg.staff_id) {
      return <p className="text-sm text-sub">{t("schedule.noStaffProfile")}</p>;
    }
    return (
      <div>
        <div className="mb-6">
          <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("schedule.title")}</h1>
          <p className="text-[13px] text-sub">{t("schedule.subtitleStaff")}</p>
        </div>
        <WorkingHoursEditor organizationId={activeOrg.id} staffId={activeOrg.staff_id} showDailyLimitHint />
      </div>
    );
  }

  if (isManager) {
    return (
      <div>
        <div className="mb-6">
          <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("schedule.title")}</h1>
          <p className="text-[13px] text-sub">{t("schedule.subtitleManager")}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
          <div className="flex flex-col gap-1.5">
            {(staffList ?? []).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelectedStaffId(s.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors",
                  selectedStaffId === s.id ? "bg-brand/15" : "hover:bg-glass-fill",
                )}
              >
                <UserAvatar name={s.full_name} avatarUrl={s.avatar_url} size={28} />
                <span className="truncate text-[13px] font-semibold text-ink">{s.full_name}</span>
              </button>
            ))}
            {staffList && staffList.length === 0 && (
              <p className="px-3 py-2 text-[13px] text-sub">{t("schedule.noStaffYet")}</p>
            )}
          </div>
          {selectedStaffId && orgId ? (
            <WorkingHoursEditor organizationId={orgId} staffId={selectedStaffId} showDailyLimitHint={false} />
          ) : (
            <div className="glass flex items-center justify-center p-10 text-center">
              <p className="text-sm text-sub">{t("schedule.pickStaffHint")}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
