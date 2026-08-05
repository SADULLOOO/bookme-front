"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Clock, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useT } from "@/lib/i18n/use-t";
import type { WorkingHours } from "@/lib/types";

const DAYS = [0, 1, 2, 3, 4, 5, 6];

export function WorkingHoursEditor({
  organizationId,
  staffId,
  showDailyLimitHint,
}: {
  organizationId: string;
  staffId: string;
  showDailyLimitHint: boolean;
}) {
  const t = useT();
  const { data: hours, mutate } = useApi<WorkingHours[]>(
    `/organizations/${organizationId}/staff/${staffId}/working-hours`,
  );
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("18:00");
  const [busy, setBusy] = useState(false);

  const byDay = new Map((hours ?? []).map((h) => [h.day_of_week, h]));

  function startEdit(day: number) {
    const existing = byDay.get(day);
    setStart(existing ? existing.start_time.slice(0, 5) : "09:00");
    setEnd(existing ? existing.end_time.slice(0, 5) : "18:00");
    setEditingDay(day);
  }

  async function save(day: number) {
    setBusy(true);
    try {
      const existing = byDay.get(day);
      if (existing) {
        await apiFetch(`/organizations/${organizationId}/staff/${staffId}/working-hours/${existing.id}`, {
          method: "PATCH",
          body: { start_time: start, end_time: end },
        });
      } else {
        await apiFetch(`/organizations/${organizationId}/staff/${staffId}/working-hours`, {
          method: "POST",
          body: { day_of_week: day, start_time: start, end_time: end },
        });
      }
      toast.success(t("schedule.saved"));
      setEditingDay(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(day: number) {
    const existing = byDay.get(day);
    if (!existing) return;
    setBusy(true);
    try {
      await apiFetch(`/organizations/${organizationId}/staff/${staffId}/working-hours/${existing.id}`, {
        method: "DELETE",
      });
      toast.success(t("schedule.removed"));
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass p-5">
      <h3 className="mb-1 font-display text-[14px] font-bold text-ink">{t("schedule.weeklyHours")}</h3>
      {showDailyLimitHint && <p className="mb-3 text-[11.5px] text-sub-2">{t("schedule.dailyLimitHint")}</p>}
      <div className={showDailyLimitHint ? "mt-3 flex flex-col divide-y divide-glass-border" : "mt-4 flex flex-col divide-y divide-glass-border"}>
        {DAYS.map((day) => {
          const entry = byDay.get(day);
          const isEditing = editingDay === day;
          return (
            <div key={day} className="flex items-center gap-3 py-2.5">
              <span className="w-24 shrink-0 text-[13px] font-semibold text-ink">{t(`schedule.day.${day}`)}</span>
              {isEditing ? (
                <div className="flex flex-1 flex-wrap items-center gap-2">
                  <input
                    type="time"
                    value={start}
                    onChange={(e) => setStart(e.target.value)}
                    className="rounded-lg border border-glass-border bg-glass-fill px-2 py-1 text-[13px] text-ink outline-none focus:border-brand"
                  />
                  <span className="text-sub-2">–</span>
                  <input
                    type="time"
                    value={end}
                    onChange={(e) => setEnd(e.target.value)}
                    className="rounded-lg border border-glass-border bg-glass-fill px-2 py-1 text-[13px] text-ink outline-none focus:border-brand"
                  />
                  <Button size="sm" disabled={busy} onClick={() => save(day)} className="rounded-full">
                    {t("common.save")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingDay(null)} className="rounded-full">
                    {t("common.cancel")}
                  </Button>
                </div>
              ) : entry ? (
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 font-mono text-[13px] text-sub">
                    <Clock className="size-3.5" />
                    {entry.start_time.slice(0, 5)}–{entry.end_time.slice(0, 5)}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(day)}
                      className="flex size-7 items-center justify-center rounded-lg text-sub transition-colors hover:bg-glass-fill-strong hover:text-ink"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(day)}
                      disabled={busy}
                      className="flex size-7 items-center justify-center rounded-lg text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-between gap-2">
                  <span className="text-[13px] text-sub-2">{t("schedule.notWorking")}</span>
                  <button
                    type="button"
                    onClick={() => startEdit(day)}
                    className="flex items-center gap-1 text-[12px] font-semibold text-brand"
                  >
                    <Plus className="size-3.5" /> {t("schedule.addHours")}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
