"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Briefcase, Building2, CalendarCheck, Search } from "lucide-react";
import { OtpInput } from "@/components/auth/otp-input";
import { LanguageSwitcher } from "@/components/language-switcher";
import { CvUploadField } from "@/components/cv-upload-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useT, type TranslateFn } from "@/lib/i18n/use-t";
import { verticalMeta, VERTICALS } from "@/lib/verticals";
import { cn } from "@/lib/utils";
import type { PublicOrganizationSummary } from "@/lib/types";

type Intent = "client" | "employee" | "owner";
type Step = "intent" | "vertical" | "target" | "details" | "account" | "otp";

export default function RegisterPage() {
  const t = useT();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<Step>("intent");
  const [intent, setIntent] = useState<Intent | null>(null);
  const [vertical, setVertical] = useState<string | null>(null);

  // employee path
  const [targetOrg, setTargetOrg] = useState<PublicOrganizationSummary | null>(null);
  const [desiredTitle, setDesiredTitle] = useState("");

  // owner path
  const [businessName, setBusinessName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // shared application fields
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [experience, setExperience] = useState("");

  // account fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (user) router.replace("/app");
  }, [user, router]);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/register", {
        method: "POST",
        body: {
          full_name: fullName,
          email,
          phone,
          password,
          staff_application:
            intent === "employee" && targetOrg
              ? { organization_id: targetOrg.id, desired_title: desiredTitle, cv_url: cvUrl, experience: experience || null }
              : undefined,
          business_application:
            intent === "owner"
              ? {
                  business_name: businessName,
                  business_type: vertical,
                  contact_phone: contactPhone,
                  cv_url: cvUrl,
                  experience: experience || null,
                }
              : undefined,
        },
        auth: false,
      });
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await apiFetch("/auth/confirm-email", { method: "POST", body: { email, code }, auth: false });
      await login(email, password);
      router.push(intent === "client" ? "/onboarding" : "/application-status");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("register.incorrectCode"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setError(null);
    try {
      await apiFetch("/auth/resend-confirmation", { method: "POST", body: { email }, auth: false });
      setResent(true);
    } catch {
      // best-effort — resend has no user-visible failure state
    }
  }

  function chooseIntent(next: Intent) {
    setIntent(next);
    setStep(next === "client" ? "account" : "vertical");
  }

  function afterVertical() {
    setStep(intent === "employee" ? "target" : "details");
  }

  function back() {
    if (step === "vertical") setStep("intent");
    else if (step === "target") setStep("vertical");
    else if (step === "details") setStep(intent === "employee" ? "target" : "vertical");
    else if (step === "account") setStep(intent === "client" ? "intent" : "details");
  }

  const canSubmitDetails =
    intent === "employee"
      ? !!targetOrg && desiredTitle.trim().length > 0 && !!cvUrl
      : businessName.trim().length > 0 && !!cvUrl;

  return (
    <div className="relative z-[1] flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-[560px]">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
            <span className="size-2 rounded-full bg-brand shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_22%,transparent)]" />
            BookMe
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="glass p-7">
          {step !== "intent" && step !== "otp" && (
            <button
              type="button"
              onClick={back}
              className="mb-4 flex items-center gap-1 text-[12.5px] font-semibold text-sub hover:text-ink"
            >
              <ArrowLeft className="size-3.5" /> {t("common.back")}
            </button>
          )}

          {step === "intent" && <IntentStep t={t} onChoose={chooseIntent} />}

          {step === "vertical" && (
            <VerticalStep t={t} vertical={vertical} onSelect={setVertical} onNext={afterVertical} />
          )}

          {step === "target" && (
            <TargetStep
              t={t}
              vertical={vertical!}
              value={targetOrg}
              onSelect={(org) => {
                setTargetOrg(org);
                setStep("details");
              }}
            />
          )}

          {step === "details" && intent === "employee" && targetOrg && (
            <EmployeeDetailsStep
              t={t}
              orgName={targetOrg.name}
              desiredTitle={desiredTitle}
              setDesiredTitle={setDesiredTitle}
              cvUrl={cvUrl}
              onCvUploaded={(url) => setCvUrl(url)}
              experience={experience}
              setExperience={setExperience}
              canNext={canSubmitDetails}
              onNext={() => setStep("account")}
            />
          )}

          {step === "details" && intent === "owner" && (
            <OwnerDetailsStep
              t={t}
              businessName={businessName}
              setBusinessName={setBusinessName}
              contactPhone={contactPhone}
              setContactPhone={setContactPhone}
              cvUrl={cvUrl}
              onCvUploaded={(url) => setCvUrl(url)}
              experience={experience}
              setExperience={setExperience}
              canNext={canSubmitDetails}
              onNext={() => setStep("account")}
            />
          )}

          {step === "account" && (
            <AccountStep
              t={t}
              intent={intent!}
              fullName={fullName}
              setFullName={setFullName}
              email={email}
              setEmail={setEmail}
              phone={phone}
              setPhone={setPhone}
              password={password}
              setPassword={setPassword}
              error={error}
              loading={loading}
              onSubmit={handleRegister}
            />
          )}

          {step === "otp" && (
            <>
              <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">{t("register.checkEmailTitle")}</h1>
              <p className="mb-6 text-[13px] text-sub">{t("register.checkEmailBody", { email })}</p>
              <form onSubmit={handleConfirm} className="flex flex-col gap-5">
                <OtpInput value={code} onChange={setCode} autoFocus />
                {intent !== "client" && (
                  <p className="rounded-lg bg-glass-fill px-3.5 py-3 text-[12.5px] text-sub">
                    {intent === "employee" ? t("register.employeeAppliedNote") : t("register.ownerAppliedNote")}
                  </p>
                )}
                {error && <p className="text-center text-[13px] text-destructive">{error}</p>}
                <Button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-full">
                  {loading ? t("register.confirming") : t("register.confirmEmail")}
                </Button>
                <button
                  type="button"
                  onClick={handleResend}
                  className="text-center text-[12.5px] font-semibold text-brand"
                >
                  {resent ? t("register.codeResent") : t("register.resendCode")}
                </button>
              </form>
            </>
          )}

          {step !== "otp" && (
            <p className="mt-6 text-center text-[12.5px] text-sub">
              {t("register.haveAccount")}{" "}
              <Link href="/login" className="font-semibold text-brand">
                {t("common.signIn")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function IntentStep({ t, onChoose }: { t: TranslateFn; onChoose: (i: Intent) => void }) {
  return (
    <>
      <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">{t("register.whoAreYouTitle")}</h1>
      <p className="mb-6 text-[13px] text-sub">{t("register.whoAreYouSubtitle")}</p>
      <div className="flex flex-col gap-3">
        <IntentCard
          icon={CalendarCheck}
          title={t("register.intentClientTitle")}
          description={t("register.intentClientBody")}
          onClick={() => onChoose("client")}
        />
        <IntentCard
          icon={Briefcase}
          title={t("register.intentEmployeeTitle")}
          description={t("register.intentEmployeeBody")}
          onClick={() => onChoose("employee")}
        />
        <IntentCard
          icon={Building2}
          title={t("register.intentOwnerTitle")}
          description={t("register.intentOwnerBody")}
          onClick={() => onChoose("owner")}
        />
      </div>
    </>
  );
}

function IntentCard({
  icon: Icon,
  title,
  description,
  onClick,
}: {
  icon: typeof CalendarCheck;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex items-center gap-4 rounded-2xl border border-glass-border bg-glass-fill p-4 text-left transition-colors hover:border-brand/50 hover:bg-glass-fill-strong"
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[15px] font-bold text-ink">{title}</span>
        <span className="block text-[12.5px] text-sub">{description}</span>
      </span>
    </button>
  );
}

function VerticalStep({
  t,
  vertical,
  onSelect,
  onNext,
}: {
  t: TranslateFn;
  vertical: string | null;
  onSelect: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">{t("register.pickVerticalTitle")}</h1>
      <p className="mb-6 text-[13px] text-sub">{t("register.pickVerticalSubtitle")}</p>
      <div className="grid grid-cols-3 gap-2.5">
        {VERTICALS.map((v) => {
          const Icon = v.icon;
          const active = vertical === v.value;
          return (
            <button
              type="button"
              key={v.value}
              onClick={() => onSelect(v.value)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border p-3.5 text-center text-[11.5px] font-semibold transition-colors",
                active ? "border-brand bg-brand/10 text-brand" : "border-glass-border text-sub hover:text-ink",
              )}
            >
              <Icon className="size-5" />
              {t(v.labelKey)}
            </button>
          );
        })}
      </div>
      <Button type="button" disabled={!vertical} onClick={onNext} className="mt-5 w-full rounded-full">
        {t("common.continue")}
      </Button>
    </>
  );
}

function TargetStep({
  t,
  vertical,
  value,
  onSelect,
}: {
  t: TranslateFn;
  vertical: string;
  value: PublicOrganizationSummary | null;
  onSelect: (org: PublicOrganizationSummary) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicOrganizationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ business_type: vertical, limit: "30" });
    if (query.trim()) qs.set("q", query.trim());
    apiFetch<PublicOrganizationSummary[]>(`/public/organizations?${qs.toString()}`, { auth: false })
      .then((data) => {
        if (!cancelled) setResults(data);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [vertical, query]);

  return (
    <>
      <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">{t("register.pickBusinessTitle")}</h1>
      <p className="mb-4 text-[13px] text-sub">
        {t("register.pickBusinessSubtitle", { vertical: t(verticalMeta(vertical).labelKey) })}
      </p>
      <div className="mb-3 flex items-center gap-2 rounded-lg border border-glass-border bg-glass-fill px-3 py-2">
        <Search className="size-4 shrink-0 text-sub-2" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("register.searchBusinessPlaceholder")}
          className="w-full bg-transparent text-[13px] text-ink outline-none placeholder:text-sub-2"
        />
      </div>
      <div className="flex max-h-[280px] flex-col gap-1.5 overflow-y-auto">
        {loading ? (
          <p className="py-6 text-center text-[13px] text-sub">{t("common.loading")}</p>
        ) : results.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-sub">{t("register.noBusinessesFound")}</p>
        ) : (
          results.map((org) => (
            <button
              type="button"
              key={org.id}
              onClick={() => onSelect(org)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors",
                value?.id === org.id
                  ? "border-brand bg-brand/10"
                  : "border-glass-border bg-glass-fill hover:bg-glass-fill-strong",
              )}
            >
              <span>
                <span className="block text-[13.5px] font-bold text-ink">{org.name}</span>
                {org.location && <span className="block text-[11.5px] text-sub-2">{org.location}</span>}
              </span>
              {org.review_count > 0 && (
                <span className="shrink-0 text-[11.5px] font-semibold text-sub">
                  ★ {org.average_rating?.toFixed(1)}
                </span>
              )}
            </button>
          ))
        )}
      </div>
    </>
  );
}

function EmployeeDetailsStep({
  t,
  orgName,
  desiredTitle,
  setDesiredTitle,
  cvUrl,
  onCvUploaded,
  experience,
  setExperience,
  canNext,
  onNext,
}: {
  t: TranslateFn;
  orgName: string;
  desiredTitle: string;
  setDesiredTitle: (v: string) => void;
  cvUrl: string | null;
  onCvUploaded: (url: string) => void;
  experience: string;
  setExperience: (v: string) => void;
  canNext: boolean;
  onNext: () => void;
}) {
  return (
    <>
      <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">
        {t("register.applyToTitle", { org: orgName })}
      </h1>
      <p className="mb-5 text-[13px] text-sub">{t("register.applyToSubtitle")}</p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="desiredTitle">{t("register.desiredTitleLabel")}</Label>
          <Input
            id="desiredTitle"
            required
            autoFocus
            value={desiredTitle}
            onChange={(e) => setDesiredTitle(e.target.value)}
            placeholder={t("register.desiredTitlePlaceholder")}
          />
        </div>
        <CvUploadField cvUrl={cvUrl} onUploaded={(url) => onCvUploaded(url)} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="experience">{t("register.notesLabel")}</Label>
          <Textarea
            id="experience"
            rows={3}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder={t("register.cvEmployeePlaceholder")}
          />
        </div>
      </div>
      <Button type="button" disabled={!canNext} onClick={onNext} className="mt-5 w-full rounded-full">
        {t("common.continue")}
      </Button>
    </>
  );
}

function OwnerDetailsStep({
  t,
  businessName,
  setBusinessName,
  contactPhone,
  setContactPhone,
  cvUrl,
  onCvUploaded,
  experience,
  setExperience,
  canNext,
  onNext,
}: {
  t: TranslateFn;
  businessName: string;
  setBusinessName: (v: string) => void;
  contactPhone: string;
  setContactPhone: (v: string) => void;
  cvUrl: string | null;
  onCvUploaded: (url: string) => void;
  experience: string;
  setExperience: (v: string) => void;
  canNext: boolean;
  onNext: () => void;
}) {
  return (
    <>
      <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">{t("register.tellUsAboutBusinessTitle")}</h1>
      <p className="mb-5 text-[13px] text-sub">{t("register.tellUsAboutBusinessSubtitle")}</p>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bizName">{t("business.nameLabel")}</Label>
          <Input
            id="bizName"
            required
            autoFocus
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={t("business.namePlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bizPhone">{t("register.businessPhoneLabel")}</Label>
          <Input
            id="bizPhone"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder={t("register.phonePlaceholder")}
          />
        </div>
        <CvUploadField cvUrl={cvUrl} onUploaded={(url) => onCvUploaded(url)} />
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ownerExperience">{t("register.notesLabel")}</Label>
          <Textarea
            id="ownerExperience"
            rows={3}
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder={t("register.cvOwnerPlaceholder")}
          />
        </div>
      </div>
      <Button type="button" disabled={!canNext} onClick={onNext} className="mt-5 w-full rounded-full">
        {t("common.continue")}
      </Button>
    </>
  );
}

function AccountStep({
  t,
  intent,
  fullName,
  setFullName,
  email,
  setEmail,
  phone,
  setPhone,
  password,
  setPassword,
  error,
  loading,
  onSubmit,
}: {
  t: TranslateFn;
  intent: Intent;
  fullName: string;
  setFullName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  error: string | null;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <>
      <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">{t("register.title")}</h1>
      <p className="mb-6 text-[13px] text-sub">
        {intent === "client" ? t("register.subtitle") : t("register.finishAccountSubtitle")}
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">{t("register.fullName")}</Label>
          <Input
            id="fullName"
            autoComplete="name"
            required
            autoFocus
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("register.fullNamePlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("register.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t("register.phone")}</Label>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            required
            minLength={6}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("register.phonePlaceholder")}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">{t("register.password")}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("register.passwordHint")}
          />
        </div>
        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-1 w-full rounded-full">
          {loading ? t("register.submitting") : intent === "client" ? t("register.submit") : t("register.submitApplication")}
        </Button>
      </form>
    </>
  );
}
