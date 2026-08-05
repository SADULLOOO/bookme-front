"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";

type Step = "request" | "verify" | "reset" | "done";

export default function ForgotPasswordPage() {
  const t = useT();
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/forgot-password", { method: "POST", body: { email }, auth: false });
      setStep("verify");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ reset_token: string }>("/auth/verify-reset-code", {
        method: "POST",
        body: { email, code },
        auth: false,
      });
      setResetToken(data.reset_token);
      setStep("reset");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("register.incorrectCode"));
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: { reset_token: resetToken, new_password: password },
        auth: false,
      });
      setStep("done");
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  if (step === "done") {
    return (
      <AuthCard title={t("forgotPassword.doneTitle")} description={t("forgotPassword.doneSubtitle")}>
        <Button className="w-full rounded-full" onClick={() => router.push("/login")}>
          {t("forgotPassword.backToSignInButton")}
        </Button>
      </AuthCard>
    );
  }

  if (step === "verify") {
    return (
      <AuthCard title={t("forgotPassword.verifyTitle")} description={t("forgotPassword.verifySubtitle", { email })}>
        <form onSubmit={handleVerify} className="flex flex-col gap-5">
          <OtpInput value={code} onChange={setCode} autoFocus />
          {error && <p className="text-center text-[13px] text-destructive">{error}</p>}
          <Button type="submit" disabled={loading || code.length !== 6} className="w-full rounded-full">
            {loading ? t("forgotPassword.verifying") : t("forgotPassword.verifyCode")}
          </Button>
        </form>
      </AuthCard>
    );
  }

  if (step === "reset") {
    return (
      <AuthCard title={t("forgotPassword.resetTitle")} description={t("forgotPassword.resetSubtitle")}>
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t("forgotPassword.newPassword")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full rounded-full">
            {loading ? t("forgotPassword.saving") : t("forgotPassword.saveNewPassword")}
          </Button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t("forgotPassword.requestTitle")} description={t("forgotPassword.requestSubtitle")}>
      <form onSubmit={handleRequest} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">{t("forgotPassword.email")}</Label>
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
        {error && <p className="text-[13px] text-destructive">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full rounded-full">
          {loading ? t("forgotPassword.sending") : t("forgotPassword.sendCode")}
        </Button>
        <Link href="/login" className="text-center text-[12.5px] font-semibold text-brand">
          {t("forgotPassword.backToSignIn")}
        </Link>
      </form>
    </AuthCard>
  );
}
