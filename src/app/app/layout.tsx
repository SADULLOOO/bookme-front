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

  // The org list (which "My Bookings" and everything role-scoped is built
  // from) is otherwise fetched exactly once per session — booking at a
  // business for the first time creates a new CLIENT membership server-side
  // (whether through the normal booking flow or the AI assistant), but
  // nothing here knew to refetch, so the new business just never appeared
  // until a full reload. Polling, not just refetch-on-action, so it's
  // covered regardless of which flow created the membership.
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      loadOrganizations().catch(() => {});
    }, 20000);
    return () => clearInterval(interval);
  }, [user, loadOrganizations]);

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
