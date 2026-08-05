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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useT } from "@/lib/i18n/use-t";
import type { Branch } from "@/lib/types";

export function AddStaffDialog({
  trigger,
  organizationId,
  onAdded,
}: {
  trigger: React.ReactNode;
  organizationId: string;
  onAdded: () => void;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [branchId, setBranchId] = useState("");
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: branches } = useApi<Branch[]>(open ? `/organizations/${organizationId}/branches` : null);

  function reset() {
    setEmail("");
    setBranchId("");
    setTitle("");
    setBio("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!branchId) return;
    setLoading(true);
    setError(null);
    try {
      const staff = await apiFetch<{ full_name: string }>(`/organizations/${organizationId}/staff`, {
        method: "POST",
        body: {
          email,
          branch_id: branchId,
          title: title.trim() || null,
          bio: bio.trim() || null,
        },
      });
      toast.success(t("members.addStaffSuccess", { name: staff.full_name }));
      setOpen(false);
      reset();
      onAdded();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("members.addStaffFailed"));
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
          <DialogTitle>{t("members.addStaffDialogTitle")}</DialogTitle>
          <DialogDescription>{t("members.addStaffDialogSubtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staffEmail">{t("members.emailLabel")}</Label>
            <Input
              id="staffEmail"
              type="email"
              required
              autoFocus
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="staff@example.com"
            />
          </div>
          <p className="text-[11.5px] text-sub-2">{t("members.addStaffEmailHint")}</p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staffBranch">{t("members.branchLabel")}</Label>
            <Select value={branchId} onValueChange={(v) => setBranchId(v as string)}>
              <SelectTrigger id="staffBranch" className="w-full border-glass-border bg-glass-fill">
                <SelectValue placeholder={t("members.branchPlaceholder")}>
                  {(value: string | null) => branches?.find((b) => b.id === value)?.name ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {(branches ?? []).map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staffTitle">{t("members.jobTitleLabel")}</Label>
            <Input
              id="staffTitle"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("members.jobTitlePlaceholder")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="staffBio">{t("members.bioLabel")}</Label>
            <Textarea
              id="staffBio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={2000}
              rows={2}
            />
          </div>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <Button type="submit" disabled={!email || !branchId || loading} className="w-full rounded-full">
            {loading ? t("members.addStaffSubmitting") : t("members.addStaffSubmit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
