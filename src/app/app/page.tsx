"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActiveOrg, useOrgStore } from "@/lib/stores/org-store";

export default function AppIndexPage() {
  const router = useRouter();
  const activeOrg = useActiveOrg();
  const orgLoaded = useOrgStore((s) => s.loaded);

  useEffect(() => {
    if (!orgLoaded) return;
    router.replace(activeOrg ? "/app/dashboard" : "/app/home");
  }, [orgLoaded, activeOrg, router]);

  return null;
}
