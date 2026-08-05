"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowRight, Building2, CalendarCheck } from "lucide-react";
import { BusinessCreateForm } from "@/components/business-create-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";

type Path = "client" | "owner" | null;

export default function OnboardingPage() {
  const t = useT();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const [path, setPath] = useState<Path>(null);

  useEffect(() => {
    if (hydrated && !user) router.replace("/login");
  }, [hydrated, user, router]);

  function chooseClient() {
    toast.success(t("onboarding.welcomeToast", { name: user?.full_name.split(" ")[0] ?? "" }));
    router.push("/app/home");
  }

  if (!hydrated || !user) return null;

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
          {path === "owner" ? (
            <>
              <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">{t("onboarding.whatToRun")}</h1>
              <p className="mb-6 text-[13px] text-sub">{t("onboarding.pickMatch")}</p>
              <BusinessCreateForm
                submitLabel={t("onboarding.createBusiness")}
                onSubmitted={(application) => {
                  toast.success(t("business.submittedToast", { name: application.business_name }));
                  router.push("/application-status");
                }}
              />
              <button
                type="button"
                onClick={() => setPath(null)}
                className="mt-4 text-center text-[12.5px] font-semibold text-sub hover:text-ink"
              >
                ← {t("common.back")}
              </button>
            </>
          ) : (
            <>
              <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">
                {t("onboarding.welcome", { name: user.full_name.split(" ")[0] })}
              </h1>
              <p className="mb-6 text-[13px] text-sub">{t("onboarding.subtitle")}</p>
              <div className="flex flex-col gap-3">
                <ChoiceCard
                  icon={CalendarCheck}
                  title={t("onboarding.clientTitle")}
                  description={t("onboarding.clientBody")}
                  onClick={chooseClient}
                />
                <ChoiceCard
                  icon={Building2}
                  title={t("onboarding.ownerTitle")}
                  description={t("onboarding.ownerBody")}
                  onClick={() => setPath("owner")}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ChoiceCard({
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
      className={cn(
        "group flex items-center gap-4 rounded-2xl border border-glass-border bg-glass-fill p-4 text-left transition-colors hover:border-brand/50 hover:bg-glass-fill-strong",
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[15px] font-bold text-ink">{title}</span>
        <span className="block text-[12.5px] text-sub">{description}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-sub-2 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
