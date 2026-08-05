"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, ChevronDown, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { API_URL, apiFetch, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { StaffApplication } from "@/lib/types";

export function StaffApplicationsPanel({
  organizationId,
  onHandled,
}: {
  organizationId: string;
  onHandled?: () => void;
}) {
  const t = useT();
  const { data: applications, mutate } = useApi<StaffApplication[]>(
    `/organizations/${organizationId}/applications/staff`,
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (!applications || applications.length === 0) return null;

  async function respond(app: StaffApplication, approve: boolean, rejectReason?: string) {
    setBusyId(app.id);
    try {
      await apiFetch(
        `/organizations/${organizationId}/applications/staff/${app.id}/${approve ? "approve" : "reject"}`,
        { method: "POST", body: approve ? undefined : { reason: rejectReason?.trim() || null } },
      );
      toast.success(approve ? t("members.applicationAccepted", { name: app.applicant_name }) : t("members.applicationRejected", { name: app.applicant_name }));
      setRejectingId(null);
      setReason("");
      mutate();
      onHandled?.();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mb-5">
      <h2 className="mb-2.5 flex items-center gap-2 font-display text-[14px] font-bold text-ink">
        {t("members.applicationsTitle")}
        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand px-1 text-[10px] font-extrabold text-brand-ink">
          {applications.length}
        </span>
      </h2>
      <div className="flex flex-col gap-2">
        {applications.map((app) => {
          const isOpen = expanded === app.id;
          const isRejecting = rejectingId === app.id;
          return (
            <div key={app.id} className="glass overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : app.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-bold text-ink">{app.applicant_name}</div>
                  <div className="truncate text-[11.5px] text-sub-2">{app.desired_title}</div>
                </div>
                <ChevronDown className={cn("size-4 shrink-0 text-sub-2 transition-transform", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="border-t border-glass-border px-4 py-3.5">
                  <div className="mb-3">
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
                  {isRejecting ? (
                    <div className="flex flex-col gap-2">
                      <Textarea
                        autoFocus
                        rows={2}
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder={t("members.rejectReasonPlaceholder")}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={busyId === app.id}
                          onClick={() => respond(app, false, reason)}
                          className="rounded-full"
                        >
                          {t("members.confirmReject")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectingId(null);
                            setReason("");
                          }}
                          className="rounded-full"
                        >
                          {t("common.cancel")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        disabled={busyId === app.id}
                        onClick={() => respond(app, true)}
                        className="rounded-full"
                      >
                        <Check className="size-3.5" /> {t("members.accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === app.id}
                        onClick={() => setRejectingId(app.id)}
                        className="rounded-full"
                      >
                        <X className="size-3.5" /> {t("members.reject")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
