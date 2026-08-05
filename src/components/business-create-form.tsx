"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CvUploadField } from "@/components/cv-upload-field";
import { apiFetch, ApiError } from "@/lib/api";
import { useOrgStore } from "@/lib/stores/org-store";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import { VERTICALS } from "@/lib/verticals";
import type { BusinessApplication } from "@/lib/types";

export const MAX_OWNED_BUSINESSES = 3;

export function ownedBusinessCount(organizations: { role: string }[]): number {
  return organizations.filter((o) => o.role === "owner").length;
}

export function BusinessCreateForm({
  onSubmitted,
  submitLabel,
}: {
  onSubmitted: (application: BusinessApplication) => void;
  submitLabel?: string;
}) {
  const t = useT();
  const organizations = useOrgStore((s) => s.organizations);
  const ownedCount = ownedBusinessCount(organizations);
  const [vertical, setVertical] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [experience, setExperience] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const atLimit = ownedCount >= MAX_OWNED_BUSINESSES;
  const canSubmit = !atLimit && !!vertical && name.trim().length > 0 && !!cvUrl;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !vertical) return;
    setLoading(true);
    setError(null);
    try {
      const application = await apiFetch<BusinessApplication>("/applications/business", {
        method: "POST",
        body: {
          business_name: name,
          business_type: vertical,
          contact_phone: phone || null,
          cv_url: cvUrl,
          experience: experience || null,
        },
      });
      onSubmitted(application);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("business.createError"));
    } finally {
      setLoading(false);
    }
  }

  if (atLimit) {
    return <p className="text-[13px] text-sub">{t("business.limitReachedBody", { max: MAX_OWNED_BUSINESSES })}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {VERTICALS.map((v) => {
          const Icon = v.icon;
          const active = vertical === v.value;
          return (
            <button
              type="button"
              key={v.value}
              onClick={() => setVertical(v.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-[11px] font-semibold transition-colors",
                active ? "border-brand bg-brand/10 text-brand" : "border-glass-border text-sub hover:text-ink",
              )}
            >
              <Icon className="size-5" />
              {t(v.labelKey)}
            </button>
          );
        })}
      </div>
      {vertical && (
        <>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bizName">{t("business.nameLabel")}</Label>
            <Input
              id="bizName"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("business.namePlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bizPhone2">{t("register.businessPhoneLabel")}</Label>
            <Input
              id="bizPhone2"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("register.phonePlaceholder")}
            />
          </div>
          <CvUploadField cvUrl={cvUrl} onUploaded={(url) => setCvUrl(url)} />
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bizExperience">{t("register.notesLabel")}</Label>
            <Textarea
              id="bizExperience"
              rows={3}
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder={t("register.cvOwnerPlaceholder")}
            />
          </div>
        </>
      )}
      {error && <p className="text-[13px] text-destructive">{error}</p>}
      <Button type="submit" disabled={!canSubmit || loading} className="rounded-full">
        {loading ? t("business.creating") : (submitLabel ?? t("business.submitForReview"))}
      </Button>
    </form>
  );
}
