import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-[1] flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-[400px]">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-[15px] font-bold text-ink">
            <span className="size-2 rounded-full bg-brand shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_22%,transparent)]" />
            BookMe
          </Link>
          <LanguageSwitcher />
        </div>
        <div className="glass p-7">
          <h1 className="mb-1.5 font-display text-[22px] font-bold text-ink">{title}</h1>
          {description && <p className="mb-6 text-[13px] text-sub">{description}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
