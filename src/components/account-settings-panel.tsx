"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { OtpInput } from "@/components/auth/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useT } from "@/lib/i18n/use-t";
import type { User } from "@/lib/types";

type EmailStep = "idle" | "enterEmail" | "enterCode";

export function AccountSettingsPanel() {
  const t = useT();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const logout = useAuthStore((s) => s.logout);

  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [emailStep, setEmailStep] = useState<EmailStep>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  if (!user) return null;

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await apiFetch<User>("/auth/me", {
        method: "PATCH",
        body: { full_name: fullName, phone: phone || null, avatar_url: avatarUrl || null },
      });
      await fetchMe();
      toast.success(t("account.profileUpdated"));
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("account.saveFailed"));
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleRequestEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailBusy(true);
    setEmailError(null);
    try {
      await apiFetch("/auth/change-email/request", { method: "POST", body: { new_email: newEmail } });
      setEmailStep("enterCode");
    } catch (err) {
      setEmailError(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleConfirmEmailChange(e: React.FormEvent) {
    e.preventDefault();
    setEmailBusy(true);
    setEmailError(null);
    try {
      await apiFetch<User>("/auth/change-email/confirm", { method: "POST", body: { code } });
      await fetchMe();
      setEmailStep("idle");
      setNewEmail("");
      setCode("");
      toast.success(t("account.emailUpdated"));
    } catch (err) {
      setEmailError(err instanceof ApiError ? String(err.detail) : t("register.incorrectCode"));
    } finally {
      setEmailBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <form onSubmit={handleSaveProfile} className="glass flex flex-col gap-4 p-6">
        <h3 className="font-display text-[15px] font-bold text-ink">{t("account.personalDetails")}</h3>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="fullName">{t("account.fullName")}</Label>
          <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">{t("account.phone")}</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="avatarUrl">{t("account.avatarUrl")}</Label>
          <Input
            id="avatarUrl"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
          />
        </div>
        <Button type="submit" disabled={savingProfile} className="mt-1 self-start rounded-full px-5">
          {savingProfile ? t("account.saving") : t("account.saveChanges")}
        </Button>
      </form>

      <div className="glass flex flex-col gap-4 p-6">
        <h3 className="font-display text-[15px] font-bold text-ink">{t("account.emailSecurity")}</h3>

        {emailStep === "idle" && (
          <>
            <div className="flex flex-col gap-1.5">
              <Label>{t("account.email")}</Label>
              <Input value={user.email} disabled />
            </div>
            <Button
              type="button"
              variant="outline"
              className="self-start rounded-full px-5"
              onClick={() => setEmailStep("enterEmail")}
            >
              {t("account.changeEmail")}
            </Button>
          </>
        )}

        {emailStep === "enterEmail" && (
          <form onSubmit={handleRequestEmailChange} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="newEmail">{t("account.newEmail")}</Label>
              <Input
                id="newEmail"
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            {emailError && <p className="text-[13px] text-destructive">{emailError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={emailBusy} className="rounded-full px-5">
                {emailBusy ? t("account.sending") : t("account.sendCode")}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setEmailStep("idle")}>
                {t("account.cancel")}
              </Button>
            </div>
          </form>
        )}

        {emailStep === "enterCode" && (
          <form onSubmit={handleConfirmEmailChange} className="flex flex-col gap-3">
            <p className="text-[13px] text-sub">{t("account.enterCodeSentTo", { email: newEmail })}</p>
            <OtpInput value={code} onChange={setCode} autoFocus />
            {emailError && <p className="text-center text-[13px] text-destructive">{emailError}</p>}
            <Button type="submit" disabled={emailBusy || code.length !== 6} className="rounded-full px-5">
              {emailBusy ? t("account.confirming") : t("account.confirmNewEmail")}
            </Button>
          </form>
        )}

        <div className="mt-2 border-t border-glass-border pt-4">
          <Button type="button" variant="destructive" onClick={handleLogout} className="rounded-full px-5">
            {t("account.logout")}
          </Button>
        </div>
      </div>
    </div>
  );
}
