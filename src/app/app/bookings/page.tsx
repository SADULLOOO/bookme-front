"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewDialog } from "@/components/review-dialog";
import { useApi } from "@/lib/use-api";
import { apiFetch, ApiError } from "@/lib/api";
import { useLocaleStore, LOCALE_INTL_TAG } from "@/lib/stores/locale-store";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { BookingStatus, MyBooking, PublicService, PublicStaff, Review, ReviewListOut } from "@/lib/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-avail-3/15 text-avail-3",
  confirmed: "bg-avail/15 text-avail",
  completed: "bg-glass-fill-strong text-sub",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-destructive/10 text-destructive",
};

export default function BookingsPage() {
  const t = useT();
  // Every booking this account has ever made as a customer, anywhere —
  // regardless of what role (owner/admin/staff) it might separately hold
  // at that same business today. A booking at your own business used to
  // be invisible here entirely, since "My Bookings" only ever looked at
  // orgs where your current role happened to be "client".
  const { data: bookings } = useApi<MyBooking[]>("/bookings/mine", { refreshInterval: 15000 });

  const groups = new Map<string, { name: string; slug: string; bookings: MyBooking[] }>();
  for (const b of bookings ?? []) {
    const group = groups.get(b.organization_id) ?? { name: b.organization_name, slug: b.organization_slug, bookings: [] };
    group.bookings.push(b);
    groups.set(b.organization_id, group);
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("bookings.title")}</h1>
        <p className="text-[13px] text-sub">{t("bookings.subtitle")}</p>
      </div>

      {bookings === undefined ? (
        <p className="text-sm text-sub">{t("common.loading")}</p>
      ) : groups.size === 0 ? (
        <div className="glass flex flex-col items-center gap-4 p-10 text-center">
          <p className="text-sm text-sub">{t("bookings.emptyState")}</p>
          <Button render={<Link href="/app/home" />} nativeButton={false} className="rounded-full px-5">
            {t("bookings.browse")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {Array.from(groups.entries()).map(([organizationId, group]) => (
            <OrgBookings key={organizationId} organizationId={organizationId} {...group} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgBookings({
  organizationId,
  name,
  slug,
  bookings,
}: {
  organizationId: string;
  name: string;
  slug: string;
  bookings: MyBooking[];
}) {
  const t = useT();
  const intlTag = LOCALE_INTL_TAG[useLocaleStore((s) => s.locale)];
  const { data: services } = useApi<PublicService[]>(`/public/organizations/${slug}/services`);
  const { data: staff } = useApi<PublicStaff[]>(`/public/organizations/${slug}/staff`);
  const { data: reviewData, mutate: mutateReviews } = useApi<ReviewListOut>(`/reviews/organization/${organizationId}`);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [justReviewed, setJustReviewed] = useState<Record<string, Review>>({});
  const [localBookings, setLocalBookings] = useState<MyBooking[] | null>(null);

  const serviceName = (id: string) => services?.find((s) => s.id === id)?.name ?? "";
  const staffName = (id: string) => staff?.find((s) => s.id === id)?.full_name ?? "";
  const reviewedBookingIds = new Set(reviewData?.reviews.map((r) => r.booking_id) ?? []);

  async function handleCancel(booking: MyBooking) {
    setCancellingId(booking.id);
    try {
      await apiFetch(`/organizations/${organizationId}/bookings/${booking.id}/cancel`, {
        method: "POST",
        body: { reason: "Cancelled by client" },
      });
      toast.success(t("bookings.cancelled"));
      // The /bookings/mine list will catch up on its own poll, but flip
      // this one locally right away so the button doesn't sit there
      // looking clickable for up to 15s after it already worked.
      setLocalBookings(
        (localBookings ?? bookings).map((b) => (b.id === booking.id ? { ...b, status: "cancelled" as const } : b)),
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("bookings.cancelFailed"));
    } finally {
      setCancellingId(null);
    }
  }

  const sorted = (localBookings ?? bookings)
    .slice()
    .sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));

  return (
    <div>
      <h2 className="mb-2.5 font-display text-[15px] font-bold text-ink">{name}</h2>
      <div className="flex flex-col gap-2">
        {sorted.map((b) => (
          <div key={b.id} className="glass flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="font-semibold text-ink">{serviceName(b.service_id)}</div>
              <div className="text-[12.5px] text-sub">
                {staffName(b.staff_id)} ·{" "}
                {new Date(b.start_time).toLocaleString(intlTag, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 text-[11px] font-bold capitalize",
                  STATUS_STYLES[b.status],
                )}
              >
                {t(`bookings.status.${b.status}`)}
              </span>
              {(b.status === "pending" || b.status === "confirmed") && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={cancellingId === b.id}
                  onClick={() => handleCancel(b)}
                >
                  {cancellingId === b.id ? t("bookings.cancelling") : t("bookings.cancel")}
                </Button>
              )}
              {b.status === "completed" &&
                (justReviewed[b.id] || reviewedBookingIds.has(b.id) ? (
                  <span className="flex items-center gap-1 text-[11.5px] font-semibold text-sub">
                    <Star className="size-3.5 fill-avail-3 text-avail-3" />
                    {t("bookings.rated", {
                      rating: justReviewed[b.id]?.rating ?? reviewData?.reviews.find((r) => r.booking_id === b.id)?.rating ?? "",
                    })}
                  </span>
                ) : (
                  <ReviewDialog
                    bookingId={b.id}
                    serviceName={serviceName(b.service_id)}
                    staffName={staffName(b.staff_id)}
                    onSubmitted={(review) => {
                      setJustReviewed((prev) => ({ ...prev, [b.id]: review }));
                      mutateReviews();
                    }}
                    trigger={
                      <span className="cursor-pointer rounded-full border border-glass-border bg-glass-fill px-3 py-1.5 text-[12px] font-semibold text-ink transition-colors hover:bg-glass-fill-strong">
                        {t("bookings.leaveReview")}
                      </span>
                    }
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
