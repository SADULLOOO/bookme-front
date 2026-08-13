"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";
import type { Branch } from "@/lib/types";

export function BranchFormDialog({
  trigger,
  organizationId,
  branch,
  onSaved,
}: {
  trigger: React.ReactNode;
  organizationId: string;
  branch?: Branch;
  onSaved: () => void;
}) {
  const t = useT();
  const isEdit = !!branch;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [timezone, setTimezone] = useState(branch?.timezone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName(branch?.name ?? "");
    setAddress(branch?.address ?? "");
    setPhone(branch?.phone ?? "");
    setTimezone(branch?.timezone ?? "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);
    const body = {
      name: name.trim(),
      address: address.trim() || null,
      phone: phone.trim() || null,
      timezone: timezone.trim() || null,
    };
    try {
      if (branch) {
        await apiFetch(`/organizations/${organizationId}/branches/${branch.id}`, { method: "PATCH", body });
      } else {
        await apiFetch(`/organizations/${organizationId}/branches`, { method: "POST", body });
      }
      toast.success(isEdit ? t("branches.saved") : t("branches.created"));
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("branches.saveFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("branches.editDialogTitle") : t("branches.addDialogTitle")}</DialogTitle>
          <DialogDescription>{t("branches.addDialogSubtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branchName">{t("branches.nameLabel")}</Label>
            <Input
              id="branchName"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("branches.namePlaceholder")}
              maxLength={255}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="branchAddress">{t("branches.addressLabel")}</Label>
            <Input
              id="branchAddress"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("branches.addressPlaceholder")}
              maxLength={500}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="branchPhone">{t("branches.phoneLabel")}</Label>
              <Input
                id="branchPhone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("branches.phonePlaceholder")}
                maxLength={32}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="branchTimezone">{t("branches.timezoneLabel")}</Label>
              <Input
                id="branchTimezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="Europe/Moscow"
                maxLength={64}
              />
            </div>
          </div>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <Button type="submit" disabled={!name.trim() || loading} className="w-full rounded-full">
            {loading ? t("branches.saving") : isEdit ? t("common.save") : t("branches.addSubmit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
