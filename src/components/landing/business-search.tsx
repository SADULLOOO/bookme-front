"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";
import { VERTICALS, verticalMeta } from "@/lib/verticals";
import type { PublicOrganizationSummary } from "@/lib/types";

const TYPE_FILTERS = [
  { value: "all", labelKey: "vertical.all" },
  ...VERTICALS.map((v) => ({ value: v.value, labelKey: v.labelKey })),
];

export function BusinessSearch({
  initialResults,
  type: controlledType,
  onTypeChange,
}: {
  initialResults: PublicOrganizationSummary[];
  /** Pass together with onTypeChange to drive the filter from a parent (e.g. vertical tiles above). */
  type?: string;
  onTypeChange?: (type: string) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [internalType, setInternalType] = useState("all");
  const type = controlledType ?? internalType;
  const setType = onTypeChange ?? setInternalType;
  const [results, setResults] = useState(initialResults);
  const [loading, setLoading] = useState(false);
  const [errored, setErrored] = useState(false);

  const hasFilter = query.trim() !== "" || type !== "all";
  const displayResults = hasFilter ? results : initialResults;
  const displayErrored = hasFilter && errored;

  useEffect(() => {
    if (!hasFilter) return;

    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type !== "all") params.set("business_type", type);
    params.set("limit", "9");

    const handle = setTimeout(async () => {
      setLoading(true);
      setErrored(false);
      try {
        const data = await apiFetch<PublicOrganizationSummary[]>(`/public/organizations?${params}`, {
          auth: false,
        });
        setResults(data);
      } catch {
        setErrored(true);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [query, type, hasFilter]);

  return (
    <div>
      <div className="glass mb-4 flex items-center gap-2.5 px-4 py-2.5">
        <Search className="size-4 shrink-0 text-sub-2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("search.placeholder")}
          className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setType(f.value)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
              f.value === type
                ? "border-transparent bg-brand text-brand-ink"
                : "border-glass-border bg-glass-fill text-sub hover:text-ink",
            )}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </div>

      {displayErrored && <p className="py-6 text-center text-sm text-sub">{t("search.error")}</p>}

      {!displayErrored && !loading && displayResults.length === 0 && (
        <p className="py-6 text-center text-sm text-sub">{t("search.noResults")}</p>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-3 transition-opacity sm:grid-cols-2 lg:grid-cols-3",
          loading && "opacity-50",
        )}
      >
        {displayResults.map((org) => (
          <Link
            key={org.id}
            href={`/${org.slug}`}
            className="glass group flex flex-col gap-3 p-5 transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-display text-[17px] font-bold text-ink">{org.name}</span>
              <span className="rounded-full border border-glass-border px-2.5 py-1 font-mono text-[10px] text-sub">
                {t(verticalMeta(org.business_type).labelKey)}
              </span>
            </div>
            {org.location && <p className="text-[13px] text-sub">{org.location}</p>}
            <div className="mt-auto flex items-center gap-1.5 text-[13px] text-sub">
              {org.average_rating != null ? (
                <>
                  <Star className="size-3.5 fill-avail-3 text-avail-3" />
                  <span className="font-semibold text-ink">{org.average_rating.toFixed(1)}</span>
                  <span>({org.review_count})</span>
                </>
              ) : (
                <span>{t("search.noReviews")}</span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
