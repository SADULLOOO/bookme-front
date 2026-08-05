"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/use-api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { BusinessApplication, StaffApplication } from "@/lib/types";

export default function ApplicationStatusPage() {
  const t = useT();
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  const { data: staffApps } = useApi<StaffApplication[]>(user ? "/applications/staff/mine" : null);
  const { data: businessApps } = useApi<BusinessApplication[]>(user ? "/applications/business/mine" : null);

  if (!hydrated || !user) return null;

  const latest = [...(staffApps ?? []), ...(businessApps ?? [])].sort(
    (a, b) => +new Date(b.created_at) - +new Date(a.created_at),
  )[0];
  const isStaffApp = latest && "desired_title" in latest;

  return (
    <div className="relative z-[1] flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-[480px]">
        <div className="mb-6 flex items-center justify-between">
          <span className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
            <span className="size-2 rounded-full bg-brand shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_22%,transparent)]" />
            BookMe
          </span>
          <LanguageSwitcher />
        </div>

        <div className="glass p-7 text-center">
          {!latest ? (
            <>
              <Clock className="mx-auto mb-4 size-10 text-sub-2" />
              <h1 className="mb-1.5 font-display text-[20px] font-bold text-ink">{t("appStatus.noneTitle")}</h1>
              <p className="mb-6 text-[13px] text-sub">{t("appStatus.noneBody")}</p>
            </>
          ) : latest.status === "pending" ? (
            <>
              <Clock className="mx-auto mb-4 size-10 text-avail-3" />
              <h1 className="mb-1.5 font-display text-[20px] font-bold text-ink">{t("appStatus.pendingTitle")}</h1>
              <p className="mb-1 text-[13px] text-sub">
                {isStaffApp
                  ? t("appStatus.pendingStaffBody", {
                      org: (latest as StaffApplication).organization_name,
                      title: (latest as StaffApplication).desired_title,
                    })
                  : t("appStatus.pendingBusinessBody", { business: (latest as BusinessApplication).business_name })}
              </p>
              <p className="mb-6 text-[12.5px] text-sub-2">{t("appStatus.pendingHint")}</p>
            </>
          ) : latest.status === "approved" ? (
            <>
              <CheckCircle2 className="mx-auto mb-4 size-10 text-avail" />
              <h1 className="mb-1.5 font-display text-[20px] font-bold text-ink">{t("appStatus.approvedTitle")}</h1>
              <p className="mb-6 text-[13px] text-sub">{t("appStatus.approvedBody")}</p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-4 size-10 text-destructive" />
              <h1 className="mb-1.5 font-display text-[20px] font-bold text-ink">{t("appStatus.rejectedTitle")}</h1>
              <p className={cn("mb-6 text-[13px] text-sub", latest.rejection_reason && "italic")}>
                {latest.rejection_reason || t("appStatus.rejectedBody")}
              </p>
            </>
          )}
          <Button onClick={() => router.push("/app")} className="w-full rounded-full">
            {t("appStatus.continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
