"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Rail } from "@/components/app-shell/rail";
import styles from "@/components/app-shell/app-shell.module.css";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { useT } from "@/lib/i18n/use-t";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const router = useRouter();
  const hydrated = useAuthStore((s) => s.hydrated);
  const user = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);
  const orgLoaded = useOrgStore((s) => s.loaded);
  const loadOrganizations = useOrgStore((s) => s.loadOrganizations);

  // A restored accessToken with no user yet just means fetchMe() (kicked off
  // from onRehydrateStorage) is still in flight — only bounce to /login once
  // we're sure there's truly no session, not mid-verification.
  const verifyingSession = hydrated && !user && !!accessToken;

  useEffect(() => {
    if (hydrated && !user && !accessToken) {
      router.replace("/login");
    }
  }, [hydrated, user, accessToken, router]);

  useEffect(() => {
    if (user && !orgLoaded) {
      loadOrganizations().catch(() => {});
    }
  }, [user, orgLoaded, loadOrganizations]);

  if (!hydrated || !user) {
    return (
      <div className="relative z-[1] flex min-h-dvh items-center justify-center">
        <span className="text-sm text-sub">
          {verifyingSession ? t("app.signingBackIn") : t("app.loadingAccount")}
        </span>
      </div>
    );
  }

  return (
    <>
      <Rail />
      <main className={styles.content}>{children}</main>
    </>
  );
}
