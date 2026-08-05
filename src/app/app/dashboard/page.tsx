"use client";

import { useState, type ReactNode } from "react";
import { Search, Star } from "lucide-react";
import { useActiveOrg } from "@/lib/stores/org-store";
import { useApi } from "@/lib/use-api";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { PhoneRequestAction } from "@/components/phone-request-action";
import { useLocaleStore, LOCALE_INTL_TAG } from "@/lib/stores/locale-store";
import { useT } from "@/lib/i18n/use-t";
import type {
  AnalyticsOverview,
  Booking,
  PhoneShareRequest,
  PhoneShareStatus,
  PublicService,
  ReviewListOut,
  StaffMember,
} from "@/lib/types";

export default function DashboardPage() {
  const t = useT();
  const activeOrg = useActiveOrg();
  const orgId = activeOrg?.id ?? null;
  const isManager = activeOrg?.role === "owner" || activeOrg?.role === "admin";
  const isStaff = activeOrg?.role === "staff";
  const staffId = activeOrg?.staff_id ?? null;

  const { data: overview } = useApi<AnalyticsOverview>(
    isManager && orgId ? `/organizations/${orgId}/analytics/overview` : null,
  );
  // The backend force-scopes this to the caller's own bookings when the
  // membership role is staff — no staff_id needs to be (or can be) passed.
  const { data: bookings } = useApi<Booking[]>(orgId ? `/organizations/${orgId}/bookings` : null);
  const { data: services } = useApi<PublicService[]>(orgId ? `/organizations/${orgId}/services` : null);
  const { data: staff } = useApi<StaffMember[]>(orgId ? `/organizations/${orgId}/staff` : null);
  const { data: orgReviews } = useApi<ReviewListOut>(!isStaff && orgId ? `/reviews/organization/${orgId}` : null);
  const { data: ownReviews } = useApi<ReviewListOut>(isStaff && staffId ? `/reviews/staff/${staffId}` : null);
  const reviews = isStaff ? ownReviews : orgReviews;
  const { data: outgoingPhoneRequests, mutate: mutateOutgoingPhone } = useApi<PhoneShareRequest[]>(
    isStaff && orgId ? `/organizations/${orgId}/phone-requests` : null,
  );

  function phoneStatusForClient(clientId: string): PhoneShareStatus | null {
    const reqs = (outgoingPhoneRequests ?? []).filter((r) => r.client_id === clientId);
    if (reqs.some((r) => r.status === "approved")) return "approved";
    if (reqs.some((r) => r.status === "pending")) return "pending";
    return null;
  }

  const [search, setSearch] = useState("");

  if (!activeOrg) {
    return <p className="text-sm text-sub">{t("dashboard.notPartOfBusiness")}</p>;
  }

  const serviceName = (id: string) => services?.find((s) => s.id === id)?.name ?? "";
  const staffName = (id: string) => staff?.find((s) => s.id === id)?.full_name ?? "";

  const query = search.trim().toLowerCase();
  const visibleBookings = query
    ? (bookings ?? []).filter(
        (b) => serviceName(b.service_id).toLowerCase().includes(query) || staffName(b.staff_id).toLowerCase().includes(query),
      )
    : bookings ?? [];

  const upcoming = visibleBookings
    .filter((b) => new Date(b.start_time) > new Date() && b.status !== "cancelled")
    .sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time))
    .slice(0, 6);

  const staffCompletedCount = (bookings ?? []).filter((b) => b.status === "completed").length;
  const staffUpcomingCount = (bookings ?? []).filter(
    (b) => new Date(b.start_time) > new Date() && b.status !== "cancelled",
  ).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("dashboard.overview")}</h1>
        <p className="text-[13px] text-sub">{t("dashboard.last30Days", { org: activeOrg.name })}</p>
      </div>

      {(isManager || isStaff) && (
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-sub-2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("dashboard.searchPlaceholder")}
            className="glass w-full rounded-full py-2.5 pl-10 pr-4 text-[13px] text-ink placeholder:text-sub-2 focus:outline-none"
          />
        </div>
      )}

      {isManager ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={t("dashboard.bookings")} value={overview?.total_bookings ?? "—"} />
            <StatTile label={t("dashboard.completed")} value={overview?.completed_count ?? "—"} />
            <StatTile
              label={t("dashboard.noShowRate")}
              value={overview ? `${(overview.no_show_rate * 100).toFixed(1)}%` : "—"}
            />
            <StatTile
              label={t("dashboard.revenue")}
              value={
                overview?.revenue.length
                  ? `$${overview.revenue.reduce((sum, r) => sum + Number(r.amount), 0).toFixed(0)}`
                  : "$0"
              }
            />
          </div>
          <div className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div className="glass p-5">
              <h3 className="mb-3 font-display text-[14px] font-bold text-ink">{t("dashboard.busiestHours")}</h3>
              {overview?.busiest_hours.length ? (
                <div className="flex h-32 items-end gap-2">
                  {overview.busiest_hours.map((h) => {
                    const max = Math.max(...overview.busiest_hours.map((x) => x.count), 1);
                    return (
                      <div key={h.hour} className="flex flex-1 flex-col items-center gap-1.5">
                        <div
                          className="w-full rounded-t-sm bg-brand"
                          style={{ height: `${Math.max((h.count / max) * 100, 4)}%` }}
                        />
                        <span className="font-mono text-[10px] text-sub-2">{h.hour}h</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-sub">{t("dashboard.noBookingsPeriod")}</p>
              )}
            </div>
            <BookingsList bookings={upcoming} serviceName={serviceName} staffName={staffName} />
          </div>
        </>
      ) : isStaff ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile label={t("dashboard.upcoming")} value={staffUpcomingCount} />
            <StatTile label={t("dashboard.completed")} value={staffCompletedCount} />
            <StatTile
              label={t("dashboard.yourRating")}
              value={ownReviews?.summary.average_rating ? ownReviews.summary.average_rating.toFixed(1) : "—"}
            />
            <StatTile label={t("dashboard.reviewsReceived")} value={ownReviews?.summary.review_count ?? 0} />
          </div>
          <div className="mb-4">
            <BookingsList
              bookings={upcoming}
              serviceName={serviceName}
              staffName={staffName}
              title={t("dashboard.upcomingBookings")}
              renderAction={
                orgId
                  ? (b) => (
                      <PhoneRequestAction
                        organizationId={orgId}
                        bookingId={b.id}
                        clientId={b.client_id}
                        status={phoneStatusForClient(b.client_id)}
                        onRequested={() => mutateOutgoingPhone()}
                      />
                    )
                  : undefined
              }
            />
          </div>
        </>
      ) : (
        <div className="mb-4">
          <BookingsList
            bookings={upcoming}
            serviceName={serviceName}
            staffName={staffName}
            title={t("dashboard.upcomingBookings")}
          />
        </div>
      )}

      <div className="glass mb-4 p-5">
        <h3 className="mb-3 font-display text-[14px] font-bold text-ink">{t("dashboard.reviews")}</h3>
        {reviews && reviews.summary.review_count > 0 ? (
          <>
            <p className="mb-3 font-mono text-xl font-semibold text-ink">
              {reviews.summary.average_rating?.toFixed(1)}
              <span className="ml-1.5 font-sans text-[12px] font-normal text-sub">
                / 5 · {reviews.summary.review_count} {t("org.reviews")}
              </span>
            </p>
            <div className="divide-y divide-glass-border">
              {reviews.reviews.slice(0, 4).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
                  <div className="flex min-w-0 items-center gap-1">
                    {Array.from({ length: r.rating }, (_, i) => (
                      <Star key={i} className="size-3 shrink-0 fill-avail-3 text-avail-3" />
                    ))}
                    <span className="ml-1.5 truncate text-ink">{r.comment ?? t("dashboard.noComment")}</span>
                  </div>
                  <span className="shrink-0 text-sub-2">{r.client_display_name}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-sub">{t("dashboard.noReviewsYet")}</p>
        )}
      </div>

      <AccountSettingsPanel />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="glass p-4">
      <div className="mb-2 text-[11.5px] text-sub">{label}</div>
      <div className="font-mono text-2xl font-bold text-ink">{value}</div>
    </div>
  );
}

function BookingsList({
  bookings,
  serviceName,
  staffName,
  title,
  renderAction,
}: {
  bookings: Booking[];
  serviceName: (id: string) => string;
  staffName: (id: string) => string;
  title?: string;
  renderAction?: (booking: Booking) => ReactNode;
}) {
  const t = useT();
  const intlTag = LOCALE_INTL_TAG[useLocaleStore((s) => s.locale)];
  return (
    <div className="glass p-5">
      <h3 className="mb-3 font-display text-[14px] font-bold text-ink">{title ?? t("dashboard.recentBookings")}</h3>
      {bookings.length === 0 ? (
        <p className="text-sm text-sub">{t("dashboard.nothingComingUp")}</p>
      ) : (
        <div className="divide-y divide-glass-border">
          {bookings.map((b) => (
            <div key={b.id} className="flex items-center justify-between gap-3 py-2.5 text-[13px]">
              <div>
                <div className="font-semibold text-ink">{serviceName(b.service_id)}</div>
                <div className="text-[12px] text-sub-2">{staffName(b.staff_id)}</div>
                {renderAction && <div className="mt-1">{renderAction(b)}</div>}
              </div>
              <span className="shrink-0 font-mono text-[12px] text-sub">
                {new Date(b.start_time).toLocaleString(intlTag, {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
