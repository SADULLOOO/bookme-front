import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "tg" | "en" | "ru";

export const LOCALE_META: Record<Locale, { label: string; flag: string }> = {
  tg: { label: "Тоҷикӣ", flag: "🇹🇯" },
  en: { label: "English", flag: "🇬🇧" },
  ru: { label: "Русский", flag: "🇷🇺" },
};

/** BCP-47 tag for Intl/toLocaleString calls — Tajik ICU data is thin, but
 * browsers fall back to sane defaults rather than throwing. */
export const LOCALE_INTL_TAG: Record<Locale, string> = {
  tg: "tg-TJ",
  en: "en-US",
  ru: "ru-RU",
};

interface LocaleState {
  locale: Locale;
  hydrated: boolean;
  setLocale: (locale: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "tg",
      hydrated: false,
      setLocale: (locale) => set({ locale }),
    }),
    { name: "bookme-locale" },
  ),
);

// hydrated flips true on the client once persist's rehydration runs — needed
// so server-rendered markup (always "tg") matches the first client paint.
if (typeof window !== "undefined") {
  useLocaleStore.persist.onFinishHydration(() => {
    useLocaleStore.setState({ hydrated: true });
  });
  if (useLocaleStore.persist.hasHydrated()) {
    useLocaleStore.setState({ hydrated: true });
  }
}
