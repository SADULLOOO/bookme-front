"use client";

import { Building2 } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { AccountSettingsPanel } from "@/components/account-settings-panel";
import { CreateBusinessDialog } from "@/components/create-business-dialog";
import { MAX_OWNED_BUSINESSES, ownedBusinessCount } from "@/components/business-create-form";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOrgStore } from "@/lib/stores/org-store";
import { useT } from "@/lib/i18n/use-t";

export default function ProfilePage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const organizations = useOrgStore((s) => s.organizations);
  const orgLoaded = useOrgStore((s) => s.loaded);
  const ownedCount = ownedBusinessCount(organizations);
  if (!user) return null;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-2xl font-bold text-ink">{t("profile.title")}</h1>
          <p className="text-[13px] text-sub">{t("profile.subtitle")}</p>
        </div>
        {orgLoaded && organizations.length > 0 && (
          ownedCount >= MAX_OWNED_BUSINESSES ? (
            <span className="flex items-center gap-1.5 rounded-full border border-glass-border bg-glass-fill px-3.5 py-2 text-[12.5px] font-semibold text-sub-2">
              <Building2 className="size-3.5" /> {t("business.limitReachedShort")}
            </span>
          ) : (
            <CreateBusinessDialog
              trigger={
                <span className="flex cursor-pointer items-center gap-1.5 rounded-full border border-glass-border bg-glass-fill px-3.5 py-2 text-[12.5px] font-semibold text-ink transition-colors hover:bg-glass-fill-strong">
                  <Building2 className="size-3.5" />
                  {ownedCount === 0 ? t("profile.addBusiness") : t("business.addAnother")}
                </span>
              }
            />
          )
        )}
      </div>

      <div className="glass mb-6 flex items-center gap-4 p-6">
        <UserAvatar name={user.full_name} avatarUrl={user.avatar_url} role="client" size={60} />
        <div>
          <div className="font-display text-lg font-bold text-ink">{user.full_name}</div>
          <div className="text-[13px] text-sub-2">{user.email}</div>
        </div>
      </div>

      {orgLoaded && organizations.length === 0 && (
        <div className="glass mb-6 flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <div className="mb-1 font-display text-[15px] font-bold text-ink">{t("profile.runBusinessQ")}</div>
            <p className="max-w-[46ch] text-[13px] text-sub">{t("profile.runBusinessBody")}</p>
          </div>
          <CreateBusinessDialog
            trigger={
              <span className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-brand px-4 py-2.5 text-[13px] font-bold text-brand-ink transition-transform hover:scale-[1.03]">
                <Building2 className="size-4" /> {t("profile.listBusiness")}
              </span>
            }
          />
        </div>
      )}

      <AccountSettingsPanel />
    </div>
  );
}
