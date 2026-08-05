"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReviewDialog } from "@/components/review-dialog";
import { useOrgStore } from "@/lib/stores/org-store";
import { useApi } from "@/lib/use-api";
import { apiFetch, ApiError } from "@/lib/api";
import { useLocaleStore, LOCALE_INTL_TAG } from "@/lib/stores/locale-store";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type {
  Booking,
  BookingStatus,
  OrganizationWithRole,
  PublicService,
  PublicStaff,
  Review,
  ReviewListOut,
} from "@/lib/types";

const STATUS_STYLES: Record<BookingStatus, string> = {
  pending: "bg-avail-3/15 text-avail-3",
  confirmed: "bg-avail/15 text-avail",
  completed: "bg-glass-fill-strong text-sub",
  cancelled: "bg-destructive/10 text-destructive",
  no_show: "bg-destructive/10 text-destructive",
};

export default function BookingsPage() {
  const t = useT();
  const organizations = useOrgStore((s) => s.organizations);
  const orgLoaded = useOrgStore((s) => s.loaded);
  const clientOrgs = organizations.filter((o) => o.role === "client");

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("bookings.title")}</h1>
        <p className="text-[13px] text-sub">{t("bookings.subtitle")}</p>
      </div>

      {!orgLoaded ? (
        <p className="text-sm text-sub">{t("common.loading")}</p>
      ) : clientOrgs.length === 0 ? (
        <div className="glass flex flex-col items-center gap-4 p-10 text-center">
          <p className="text-sm text-sub">{t("bookings.emptyState")}</p>
          <Button render={<Link href="/app/home" />} nativeButton={false} className="rounded-full px-5">
            {t("bookings.browse")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {clientOrgs.map((org) => (
            <OrgBookings key={org.id} org={org} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrgBookings({ org }: { org: OrganizationWithRole }) {
  const t = useT();
  const intlTag = LOCALE_INTL_TAG[useLocaleStore((s) => s.locale)];
  // Polls rather than relying on a manual refresh — a booking made through
  // the AI assistant (a different page, possibly a different tab) should
  // show up here on its own, per the "no refresh needed" requirement.
  const { data: bookings, mutate } = useApi<Booking[]>(`/organizations/${org.id}/bookings`, {
    refreshInterval: 15000,
  });
  const { data: services } = useApi<PublicService[]>(`/public/organizations/${org.slug}/services`);
  const { data: staff } = useApi<PublicStaff[]>(`/public/organizations/${org.slug}/staff`);
  const { data: reviewData, mutate: mutateReviews } = useApi<ReviewListOut>(`/reviews/organization/${org.id}`);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [justReviewed, setJustReviewed] = useState<Record<string, Review>>({});

  const serviceName = (id: string) => services?.find((s) => s.id === id)?.name ?? "";
  const staffName = (id: string) => staff?.find((s) => s.id === id)?.full_name ?? "";
  const reviewedBookingIds = new Set(reviewData?.reviews.map((r) => r.booking_id) ?? []);

  async function handleCancel(booking: Booking) {
    setCancellingId(booking.id);
    try {
      await apiFetch(`/organizations/${org.id}/bookings/${booking.id}/cancel`, {
        method: "POST",
        body: { reason: "Cancelled by client" },
      });
      toast.success(t("bookings.cancelled"));
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("bookings.cancelFailed"));
    } finally {
      setCancellingId(null);
    }
  }

  const sorted = (bookings ?? [])
    .slice()
    .sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));

  return (
    <div>
      <h2 className="mb-2.5 font-display text-[15px] font-bold text-ink">{org.name}</h2>
      {bookings === undefined ? (
        <p className="text-sm text-sub">{t("common.loading")}</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-sub">{t("bookings.noneWithBusiness")}</p>
      ) : (
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
      )}
    </div>
  );
}
