"use client";

import { Languages } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALE_META, useLocaleStore, type Locale } from "@/lib/stores/locale-store";
import { cn } from "@/lib/utils";

const LOCALES: Locale[] = ["tg", "en", "ru"];

export function LanguageSwitcher({
  className,
  side = "bottom",
  align = "end",
}: {
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
}) {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-fill px-3 py-1.5 text-[12px] font-semibold text-sub transition-colors hover:text-ink",
          className,
        )}
      >
        <Languages className="size-3.5" />
        <span>{LOCALE_META[locale].flag}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={side} align={align} sideOffset={10} className="w-40">
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onClick={() => setLocale(l)}>
            <span className="mr-1.5">{LOCALE_META[l].flag}</span>
            {LOCALE_META[l].label}
            {l === locale && <span className="ml-auto text-brand">✓</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
