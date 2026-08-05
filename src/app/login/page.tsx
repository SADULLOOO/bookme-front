"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useT } from "@/lib/i18n/use-t";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only ever an internal app path (e.g. from the "message this business"
  // button) — never followed if it points off-site.
  const next = searchParams.get("next");
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/app";
  const login = useAuthStore((s) => s.login);
  const user = useAuthStore((s) => s.user);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace(safeNext);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push(safeNext);
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title={t("login.title")} description={t("login.subtitle")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("login.email")}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("login.password")}</Label>
            <Link href="/forgot-password" className="text-xs font-semibold text-brand">
              {t("login.forgot")}
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="mt-1 w-full rounded-full">
          {loading ? t("login.submitting") : t("login.submit")}
        </Button>
      </form>
      <p className="mt-6 text-center text-[12.5px] text-sub">
        {t("login.newToBookMe")}{" "}
        <Link href="/register" className="font-semibold text-brand">
          {t("login.createAccount")}
        </Link>
      </p>
    </AuthCard>
  );
}
