"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Check, ChevronDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/user-avatar";
import { apiFetch, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useLocaleStore, LOCALE_INTL_TAG } from "@/lib/stores/locale-store";
import { useT } from "@/lib/i18n/use-t";
import { nextDays, dateKey } from "@/lib/booking-dates";
import { cn } from "@/lib/utils";
import type { Booking, PublicStaff, WaitlistEntry } from "@/lib/types";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`size-3 ${i < Math.round(rating) ? "fill-avail-3 text-avail-3" : "text-glass-border-strong"}`} />
      ))}
    </span>
  );
}

const days = nextDays(14);

export function SpecialistCard({
  organizationId,
  branchId,
  staff,
}: {
  organizationId: string;
  branchId: string;
  staff: PublicStaff;
}) {
  const t = useT();
  const intlTag = LOCALE_INTL_TAG[useLocaleStore((s) => s.locale)];
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = hydrated && !!user;
  const [expanded, setExpanded] = useState(false);
  const [serviceId, setServiceId] = useState<string | null>(staff.services[0]?.id ?? null);
  const [date, setDate] = useState<Date>(days[0]);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [joiningWaitlist, setJoiningWaitlist] = useState(false);

  const service = staff.services.find((s) => s.id === serviceId) ?? staff.services[0] ?? null;

  const availabilityKey =
    expanded && service
      ? `/organizations/${organizationId}/staff/${staff.id}/availability?service_id=${service.id}&date=${dateKey(date)}`
      : null;
  const { data: availability, error: availabilityError, isLoading: slotsLoading } = useApi<{ slots: string[] }>(
    availabilityKey,
  );
  const slots = availability?.slots ?? null;
  const slotsError = availabilityError
    ? availabilityError instanceof ApiError
      ? String(availabilityError.detail)
      : t("specialist.availabilityError")
    : null;

  const noSlotsThisDay = !slotsLoading && !slotsError && slots && slots.length === 0;
  const { data: myWaitlist, mutate: refreshWaitlist } = useApi<WaitlistEntry[]>(
    noSlotsThisDay ? `/organizations/${organizationId}/waitlist` : null,
  );
  const waitlistEntry =
    myWaitlist?.find(
      (w) =>
        w.service_id === service?.id &&
        w.date === dateKey(date) &&
        (w.staff_id === null || w.staff_id === staff.id) &&
        (w.status === "waiting" || w.status === "notified"),
    ) ?? null;

  async function handleJoinWaitlist() {
    if (!service) return;
    setJoiningWaitlist(true);
    try {
      await apiFetch(`/organizations/${organizationId}/waitlist`, {
        method: "POST",
        body: { branch_id: branchId, service_id: service.id, staff_id: staff.id, date: dateKey(date) },
      });
      toast.success(t("waitlist.joined"));
      refreshWaitlist();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("waitlist.joinFailed"));
    } finally {
      setJoiningWaitlist(false);
    }
  }

  async function handleLeaveWaitlist() {
    if (!waitlistEntry) return;
    setJoiningWaitlist(true);
    try {
      await apiFetch(`/organizations/${organizationId}/waitlist/${waitlistEntry.id}`, { method: "DELETE" });
      toast.success(t("waitlist.left"));
      refreshWaitlist();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("waitlist.leaveFailed"));
    } finally {
      setJoiningWaitlist(false);
    }
  }

  async function handleBook(slot: string) {
    if (!service) return;
    setConfirming(slot);
    try {
      const result = await apiFetch<Booking>(`/organizations/${organizationId}/bookings`, {
        method: "POST",
        body: { branch_id: branchId, service_id: service.id, staff_id: staff.id, start_time: slot },
      });
      setBooking(result);
      toast.success(t("specialist.bookingConfirmed"));
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("specialist.bookingFailed"));
    } finally {
      setConfirming(null);
    }
  }

  if (staff.services.length === 0) return null;

  return (
    <div className="glass overflow-hidden">
      <button
        type="button"
        onClick={() => isAuthenticated && setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <UserAvatar name={staff.full_name} avatarUrl={staff.avatar_url} size={48} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[15px] font-bold text-ink">{staff.full_name}</div>
          {staff.title && <div className="truncate text-[12px] text-sub">{staff.title}</div>}
          <div className="mt-1 flex items-center gap-1.5">
            {staff.review_count > 0 ? (
              <>
                <Stars rating={staff.average_rating ?? 0} />
                <span className="text-[11.5px] text-sub-2">
                  {staff.average_rating?.toFixed(1)} ({staff.review_count})
                </span>
              </>
            ) : (
              <span className="text-[11px] text-sub-2">{t("specialist.noReviews")}</span>
            )}
            <span className="text-[11px] text-sub-2">
              · {staff.services.map((s) => s.name).join(", ")}
            </span>
          </div>
        </div>
        {isAuthenticated ? (
          <ChevronDown className={cn("size-4 shrink-0 text-sub-2 transition-transform", expanded && "rotate-180")} />
        ) : (
          <Button render={<Link href="/login" />} nativeButton={false} size="sm" variant="outline" className="shrink-0">
            {t("specialist.signInToBook")}
          </Button>
        )}
      </button>

      {expanded && isAuthenticated && (
        <div className="border-t border-glass-border p-4">
          {booking ? (
            <div className="flex flex-col items-center gap-2.5 py-4 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-avail/15 text-avail">
                <Check className="size-5" />
              </span>
              <h4 className="font-display text-[14.5px] font-bold text-ink">{t("specialist.youreBooked")}</h4>
              <p className="text-[13px] text-sub">
                {t("specialist.bookedSummary", {
                  service: service?.name ?? "",
                  staff: staff.full_name,
                  when: new Date(booking.start_time).toLocaleString(intlTag, {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }),
                })}
              </p>
              <Button render={<Link href="/app/bookings" />} variant="outline" size="sm" className="mt-1 rounded-full px-5">
                {t("common.viewMyBookings")}
              </Button>
            </div>
          ) : (
            <>
              {staff.services.length > 1 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {staff.services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setServiceId(s.id)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors",
                        s.id === service?.id
                          ? "border-transparent bg-brand text-brand-ink"
                          : "border-glass-border bg-glass-fill text-sub hover:text-ink",
                      )}
                    >
                      {s.name} · ${Number(s.price).toFixed(0)}
                    </button>
                  ))}
                </div>
              )}

              <div className="mb-3.5 flex gap-1.5 overflow-x-auto pb-1">
                {days.map((d) => {
                  const active = dateKey(d) === dateKey(date);
                  return (
                    <button
                      key={dateKey(d)}
                      type="button"
                      onClick={() => setDate(d)}
                      className={cn(
                        "flex shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-center transition-colors",
                        active
                          ? "border-transparent bg-brand text-brand-ink"
                          : "border-glass-border bg-glass-fill text-sub hover:text-ink",
                      )}
                    >
                      <span className="text-[10px] font-semibold uppercase">
                        {d.toLocaleDateString(intlTag, { weekday: "short" })}
                      </span>
                      <span className="font-mono text-[13px] font-bold">{d.getDate()}</span>
                    </button>
                  );
                })}
              </div>

              {slotsLoading && <p className="text-sm text-sub">{t("specialist.loadingAvailability")}</p>}
              {slotsError && <p className="text-sm text-destructive">{slotsError}</p>}
              {noSlotsThisDay && (
                <div className="flex flex-col items-start gap-2">
                  <p className="text-sm text-sub">{t("specialist.noSlotsThisDay")}</p>
                  {waitlistEntry ? (
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-avail-3/15 px-3 py-1.5 text-[12px] font-semibold text-avail-3">
                        {t("waitlist.youAreOnList")}
                      </span>
                      <button
                        type="button"
                        disabled={joiningWaitlist}
                        onClick={handleLeaveWaitlist}
                        className="rounded-full border border-glass-border bg-glass-fill px-3 py-1.5 text-[12px] font-semibold text-sub transition-colors hover:text-ink disabled:opacity-50"
                      >
                        {joiningWaitlist ? "…" : t("waitlist.leaveButton")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={joiningWaitlist}
                      onClick={handleJoinWaitlist}
                      className="rounded-full border border-glass-border bg-glass-fill px-3.5 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:border-brand hover:bg-brand/10 disabled:opacity-50"
                    >
                      {joiningWaitlist ? "…" : t("waitlist.joinButton")}
                    </button>
                  )}
                </div>
              )}
              {!slotsLoading && slots && slots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {slots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      disabled={confirming !== null}
                      onClick={() => handleBook(slot)}
                      className="rounded-lg border border-glass-border bg-glass-fill px-2 py-2 font-mono text-[12.5px] font-semibold text-ink transition-colors hover:border-brand hover:bg-brand/10 disabled:opacity-50"
                    >
                      {confirming === slot
                        ? "…"
                        : new Date(slot).toLocaleTimeString(intlTag, { hour: "numeric", minute: "2-digit" })}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
