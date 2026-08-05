"use client";

import { useState } from "react";
import Image from "next/image";
import { BusinessSearch } from "@/components/landing/business-search";
import { useT } from "@/lib/i18n/use-t";
import { VERTICALS } from "@/lib/verticals";
import type { PublicOrganizationSummary } from "@/lib/types";

export function DirectoryExplorer({ initialResults }: { initialResults: PublicOrganizationSummary[] }) {
  const t = useT();
  const [type, setType] = useState("all");

  return (
    <>
      <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

      <BusinessSearch initialResults={initialResults} type={type} onTypeChange={setType} />
    </>
  );
}
