"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus } from "lucide-react";
import { CreateBusinessDialog } from "@/components/create-business-dialog";
import { MAX_OWNED_BUSINESSES, ownedBusinessCount } from "@/components/business-create-form";
import { BusinessSearch } from "@/components/landing/business-search";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { useApi } from "@/lib/use-api";
import { useT } from "@/lib/i18n/use-t";
import { VERTICALS } from "@/lib/verticals";
import type { PublicOrganizationSummary } from "@/lib/types";

export default function HomePage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const organizations = useOrgStore((s) => s.organizations);
  const ownedCount = ownedBusinessCount(organizations);
  const [type, setType] = useState("all");
  const { data: businesses } = useApi<PublicOrganizationSummary[]>("/public/organizations?limit=9");

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-2xl font-bold text-ink">
            {t("home.welcomeBack", { name: user?.full_name.split(" ")[0] ?? "" })}
          </h1>
          <p className="text-[13px] text-sub">{t("home.subtitle")}</p>
        </div>
        {ownedCount >= MAX_OWNED_BUSINESSES ? (
          <span className="glass flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold text-sub-2">
            <Plus className="size-4" /> {t("business.limitReachedShort")}
          </span>
        ) : (
          <CreateBusinessDialog
            trigger={
              <span className="glass flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-4 py-2.5 text-[13px] font-semibold text-ink transition-colors hover:bg-glass-fill-strong">
                <Plus className="size-4" />
                {ownedCount === 0 ? t("home.listBusiness") : t("business.addAnother")}
              </span>
            }
          />
        )}
      </div>

      <section className="mb-9">
        <h2 className="mb-3 font-display text-[15px] font-bold text-ink">{t("home.browseCategory")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {VERTICALS.filter((v) => v.value !== "other").map((v) => {
            const active = type === v.value;
            return (
              <button
                key={v.value}
                type="button"
                onClick={() => setType(active ? "all" : v.value)}
                className="group relative aspect-[4/5] overflow-hidden rounded-2xl text-left"
              >
                <Image
                  src={v.photo}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 16vw, (min-width: 640px) 30vw, 45vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                {active && <div className="absolute inset-0 ring-2 ring-inset ring-brand" />}
                <div className="absolute inset-x-0 bottom-0 p-2.5">
                  <v.icon className="mb-1 size-4 text-white/90" />
                  <span className="block font-display text-[12.5px] font-bold text-white">{t(v.labelKey)}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section id="directory" className="scroll-mt-6">
        <h2 className="mb-3 font-display text-[15px] font-bold text-ink">{t("home.recommended")}</h2>
        <BusinessSearch initialResults={businesses ?? []} type={type} onTypeChange={setType} />
      </section>
    </div>
  );
}
