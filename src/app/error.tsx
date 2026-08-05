"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n/use-t";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT();
  return (
    <div className="relative z-[1] flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="font-mono text-[13px] tracking-[0.16em] text-sub-2 uppercase">{t("error.eyebrow")}</p>
      <h1 className="font-display text-3xl font-bold text-ink">{t("error.title")}</h1>
      <p className="max-w-[42ch] text-sm text-sub">{t("error.body")}</p>
      <Button onClick={() => reset()} className="mt-2 rounded-full px-6">
        {t("error.tryAgain")}
      </Button>
    </div>
  );
}
