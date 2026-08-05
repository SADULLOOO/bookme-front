"use client";

import Link from "next/link";
import { ArrowRight, HeartHandshake, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { DirectoryExplorer } from "@/components/landing/directory-explorer";
import { useT } from "@/lib/i18n/use-t";
import type { PublicOrganizationSummary } from "@/lib/types";

export function LandingContent({ businesses }: { businesses: PublicOrganizationSummary[] }) {
  const t = useT();

  return (
    <div className="relative z-[1] mx-auto max-w-[1040px] px-6 pt-8 pb-24 sm:pt-10">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
          <span className="size-2 rounded-full bg-brand shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_22%,transparent)]" />
          BookMe
        </Link>
        <div className="flex items-center gap-2.5">
          <LanguageSwitcher />
          <Button render={<Link href="/login" />} variant="outline" size="sm" className="glass rounded-full border-0 px-4">
            {t("common.signIn")}
          </Button>
        </div>
      </div>

      <p className="mb-5 flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-avail uppercase">
        <span className="size-1.5 rounded-full bg-avail" />
        {t("landing.badge")}
      </p>

      <h1 className="mb-4 max-w-[16ch] text-balance font-display text-[clamp(38px,6vw,64px)] leading-[1.02] font-bold tracking-tight text-ink">
        {t("landing.heroTitle", { emphasis: "" })}
        <em className="text-brand not-italic">{t("landing.heroEmphasis")}</em>
      </h1>

      <p className="mb-8 max-w-[46ch] text-[16.5px] leading-relaxed text-sub">{t("landing.heroBody")}</p>

      <div className="mb-16 flex flex-wrap items-center gap-3">
        <Button
          render={<Link href="/register" />}
          size="lg"
          className="rounded-full px-6 shadow-[0_10px_26px_-8px_color-mix(in_srgb,var(--brand)_55%,transparent)]"
        >
          {t("landing.startFree")} <ArrowRight className="size-4" />
        </Button>
        <Button render={<Link href="#directory" />} variant="outline" size="lg" className="glass rounded-full border-0 px-6">
          {t("landing.browseBusinesses")}
        </Button>
      </div>

      <section id="directory" className="scroll-mt-10">
        <h2 className="mb-4 font-display text-lg font-bold text-ink">{t("landing.findBusiness")}</h2>
        <DirectoryExplorer initialResults={businesses} />
      </section>

      <AboutUs />
    </div>
  );
}

function AboutUs() {
  const t = useT();
  const points = [
    { icon: HeartHandshake, titleKey: "landing.about1Title", bodyKey: "landing.about1Body" },
    { icon: ShieldCheck, titleKey: "landing.about2Title", bodyKey: "landing.about2Body" },
    { icon: Sparkles, titleKey: "landing.about3Title", bodyKey: "landing.about3Body" },
  ];

  return (
    <section id="about" className="mt-24 scroll-mt-10 border-t border-glass-border pt-16">
      <div className="mb-10 max-w-[52ch]">
        <span className="mb-3 inline-block rounded-full border border-glass-border px-3 py-1 font-mono text-[11px] text-sub">
          {t("landing.aboutBadge")}
        </span>
        <h2 className="mb-3 text-balance font-display text-[clamp(24px,3.4vw,34px)] font-bold leading-tight text-ink">
          {t("landing.aboutTitle")}
        </h2>
        <p className="text-[14.5px] leading-relaxed text-sub">{t("landing.aboutBody")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {points.map((p) => (
          <div key={p.titleKey} className="glass flex flex-col gap-3 p-5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand/12 text-brand">
              <p.icon className="size-4.5" />
            </span>
            <h3 className="font-display text-[14.5px] font-bold text-ink">{t(p.titleKey)}</h3>
            <p className="text-[13px] leading-relaxed text-sub">{t(p.bodyKey)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
