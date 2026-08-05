"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, MapPin, MessageCircle, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SpecialistCard } from "@/components/booking/specialist-card";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useT } from "@/lib/i18n/use-t";
import { verticalMeta } from "@/lib/verticals";
import type { PublicBranch, PublicOrganization, PublicService, PublicStaff, ReviewListOut } from "@/lib/types";

function Stars({ rating, size = "size-3.5" }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} className={`${size} ${i < Math.round(rating) ? "fill-avail-3 text-avail-3" : "text-glass-border-strong"}`} />
      ))}
    </span>
  );
}

export function OrgPageContent({
  org,
  branches,
  services,
  staff,
  reviewData,
}: {
  org: PublicOrganization;
  branches: PublicBranch[];
  services: PublicService[];
  staff: PublicStaff[];
  reviewData: ReviewListOut | null;
}) {
  const t = useT();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const staffById = new Map(staff.map((s) => [s.id, s]));
  const primaryBranchId = branches[0]?.id ?? staff[0]?.branch_id ?? "";

  function handleMessageBusiness() {
    const chatPath = `/app/chat?startOrg=${org.id}`;
    router.push(user ? chatPath : `/login?next=${encodeURIComponent(chatPath)}`);
  }

  const topStaff = staff
    .filter((s) => s.services.length > 0)
    .slice()
    .sort((a, b) => {
      const ratingDiff = (b.average_rating ?? -1) - (a.average_rating ?? -1);
      if (ratingDiff !== 0) return ratingDiff;
      return b.review_count - a.review_count;
    });

  return (
    <div className="relative z-[1] mx-auto max-w-[820px] px-6 pt-8 pb-24 sm:pt-10">
      <div className="mb-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
          <span className="size-2 rounded-full bg-brand shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_22%,transparent)]" />
          BookMe
        </Link>
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <Button
            render={<Link href={user ? "/app/home" : "/login"} />}
            variant="outline"
            size="sm"
            className="glass rounded-full border-0 px-4"
          >
            <ArrowLeft className="size-3.5" />
            {user ? t("org.backToApp") : t("common.signIn")}
          </Button>
        </div>
      </div>

      <div className="mb-10 flex flex-wrap items-start justify-between gap-6">
        <div>
          <span className="mb-3 inline-block rounded-full border border-glass-border px-3 py-1 font-mono text-[11px] text-sub">
            {t(verticalMeta(org.business_type).labelKey)}
          </span>
          <h1 className="max-w-[18ch] text-balance font-display text-[clamp(30px,5vw,46px)] leading-[1.05] font-bold text-ink">
            {org.name}
          </h1>
          {reviewData && reviewData.summary.review_count > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[13.5px] text-sub">
              <Star className="size-4 fill-avail-3 text-avail-3" />
              <span className="font-bold text-ink">{reviewData.summary.average_rating?.toFixed(1)}</span>
              <span>
                ({reviewData.summary.review_count} {t("org.reviews")})
              </span>
            </div>
          )}
        </div>
        <Button onClick={handleMessageBusiness} variant="outline" className="glass rounded-full border-0 px-5">
          <MessageCircle className="size-4" /> {t("org.messageBusiness")}
        </Button>
      </div>

      {branches.length > 0 && (
        <div className="mb-10 flex flex-wrap gap-3">
          {branches.map((b) => (
            <div key={b.id} className="glass flex items-center gap-2 px-4 py-2.5 text-[13px] text-sub">
              <MapPin className="size-3.5 shrink-0 text-sub-2" />
              {b.address ?? b.name}
            </div>
          ))}
        </div>
      )}

      <section className="mb-12">
        <h2 className="mb-1 font-display text-lg font-bold text-ink">{t("org.topSpecialists")}</h2>
        <p className="mb-4 text-[13px] text-sub">{t("org.topSpecialistsSubtitle")}</p>
        {topStaff.length === 0 ? (
          <p className="text-sm text-sub">{t("org.noStaff")}</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {topStaff.map((member) => (
              <SpecialistCard
                key={member.id}
                organizationId={org.id}
                branchId={member.branch_id || primaryBranchId}
                staff={member}
              />
            ))}
          </div>
        )}
      </section>

      {services.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-4 font-display text-lg font-bold text-ink">{t("org.servicesAndPricing")}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {services.map((s) => (
              <div key={s.id} className="glass flex flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-display text-[16px] font-bold text-ink">{s.name}</span>
                  <span className="font-mono text-[16px] font-semibold text-ink">${Number(s.price).toFixed(0)}</span>
                </div>
                {s.description && <p className="text-[13px] leading-relaxed text-sub">{s.description}</p>}
                <div className="mt-auto flex items-center gap-2 pt-1 text-[12px] text-sub-2">
                  <span>
                    {s.duration_minutes} {t("common.min")}
                  </span>
                  {s.deposit_amount != null && (
                    <>
                      <span>·</span>
                      <span>
                        ${Number(s.deposit_amount).toFixed(0)} {t("org.deposit")}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {reviewData && reviewData.reviews.length > 0 && (
        <section>
          <h2 className="mb-4 font-display text-lg font-bold text-ink">{t("org.reviewsTitle")}</h2>
          <div className="glass divide-y divide-glass-border p-2">
            {reviewData.reviews.slice(0, 8).map((review) => (
              <div key={review.id} className="p-3.5">
                <div className="mb-1 flex items-center gap-2">
                  <Stars rating={review.rating} />
                  <span className="text-[12px] font-semibold text-sub">
                    {t("org.reviewFor", { name: staffById.get(review.staff_id)?.full_name ?? t("org.aTeamMember") })}
                  </span>
                </div>
                {review.comment && <p className="text-[13.5px] text-ink">{review.comment}</p>}
                <p className="mt-1 text-[12px] text-sub-2">{review.client_display_name}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
