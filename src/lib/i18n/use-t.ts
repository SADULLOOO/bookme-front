import { useLocaleStore } from "@/lib/stores/locale-store";
import { TRANSLATIONS } from "@/lib/i18n/translations";

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

function interpolate(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return Object.entries(vars).reduce(
    (acc, [k, v]) => acc.replaceAll(`{${k}}`, String(v)),
    template,
  );
}

/** Instant client-side translation — no route or reload involved, switching
 * locale is just a Zustand state change that every `useT()` consumer re-renders on. */
export function useT(): TranslateFn {
  const locale = useLocaleStore((s) => s.locale);
  return (key, vars) => {
    const dict = TRANSLATIONS[locale];
    const template = dict[key] ?? TRANSLATIONS.en[key] ?? key;
    return interpolate(template, vars);
  };
}
