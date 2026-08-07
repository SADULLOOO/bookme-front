"use client";

import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { AiProvider } from "@/lib/types";

const OPTIONS: AiProvider[] = ["groq", "deepseek"];

/** Platform-admin-only — switching the model that answers every user's AI
 * chat is a real, live, platform-wide change, not a personal preference. */
export function AiProviderSwitch() {
  const t = useT();
  const { data, mutate } = useApi<{ provider: AiProvider }>("/ai/provider");
  const active = data?.provider;

  async function switchTo(provider: AiProvider) {
    if (!active || provider === active) return;
    const previous = active;
    mutate({ provider }, { revalidate: false });
    try {
      await apiFetch("/ai/provider", { method: "PATCH", body: { provider } });
      toast.success(t("ai.providerSwitched", { provider: t(`ai.provider.${provider}`) }));
    } catch (err) {
      mutate({ provider: previous }, { revalidate: false });
      toast.error(err instanceof ApiError ? String(err.detail) : t("ai.providerSwitchFailed"));
    }
  }

  if (!active) return null;

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-fill p-1">
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => switchTo(option)}
          className={cn(
            "rounded-full px-2.5 py-1 text-[11.5px] font-semibold capitalize transition-colors",
            option === active ? "bg-brand text-brand-ink" : "text-sub hover:text-ink",
          )}
        >
          {t(`ai.provider.${option}`)}
        </button>
      ))}
    </div>
  );
}
