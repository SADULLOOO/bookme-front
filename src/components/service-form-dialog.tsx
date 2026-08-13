"use client";

import { useEffect, useState } from "react";
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
import { useT } from "@/lib/i18n/use-t";
import type { Branch, Service, ServiceCategory } from "@/lib/types";

const NO_CATEGORY = "__none__";

export function ServiceFormDialog({
  trigger,
  organizationId,
  branches,
  categories,
  service,
  onSaved,
}: {
  trigger: React.ReactNode;
  organizationId: string;
  branches: Branch[];
  categories: ServiceCategory[];
  service?: Service;
  onSaved: () => void;
}) {
  const t = useT();
  const isEdit = !!service;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [branchId, setBranchId] = useState(service?.branch_id ?? "");
  const [categoryId, setCategoryId] = useState(service?.category_id ?? NO_CATEGORY);
  const [duration, setDuration] = useState(service ? String(service.duration_minutes) : "30");
  const [price, setPrice] = useState(service ? String(service.price) : "");
  const [currency, setCurrency] = useState(service?.currency ?? "USD");
  const [deposit, setDeposit] = useState(service?.deposit_amount != null ? String(service.deposit_amount) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !isEdit && !branchId && branches.length === 1) {
      setBranchId(branches[0].id);
    }
  }, [open, isEdit, branchId, branches]);

  function reset() {
    setName(service?.name ?? "");
    setDescription(service?.description ?? "");
    setBranchId(service?.branch_id ?? "");
    setCategoryId(service?.category_id ?? NO_CATEGORY);
    setDuration(service ? String(service.duration_minutes) : "30");
    setPrice(service ? String(service.price) : "");
    setCurrency(service?.currency ?? "USD");
    setDeposit(service?.deposit_amount != null ? String(service.deposit_amount) : "");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !branchId) return;
    const durationNum = Number(duration);
    const priceNum = Number(price);
    if (!Number.isFinite(durationNum) || durationNum <= 0) {
      setError(t("services.durationInvalid"));
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError(t("services.priceInvalid"));
      return;
    }
    const depositNum = deposit.trim() ? Number(deposit) : null;
    if (deposit.trim() && (!Number.isFinite(depositNum) || (depositNum as number) < 0)) {
      setError(t("services.depositInvalid"));
      return;
    }

    setLoading(true);
    setError(null);
    const body = {
      name: name.trim(),
      description: description.trim() || null,
      branch_id: branchId,
      category_id: categoryId === NO_CATEGORY ? null : categoryId,
      duration_minutes: durationNum,
      price: priceNum,
      currency: currency.trim().toUpperCase() || "USD",
      deposit_amount: depositNum,
    };
    try {
      if (service) {
        await apiFetch(`/organizations/${organizationId}/services/${service.id}`, { method: "PATCH", body });
      } else {
        await apiFetch(`/organizations/${organizationId}/services`, { method: "POST", body });
      }
      toast.success(isEdit ? t("services.saved") : t("services.created"));
      setOpen(false);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? String(err.detail) : t("services.saveFailed"));
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
          <DialogTitle>{isEdit ? t("services.editDialogTitle") : t("services.addDialogTitle")}</DialogTitle>
          <DialogDescription>{t("services.addDialogSubtitle")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="svcName">{t("services.nameLabel")}</Label>
            <Input
              id="svcName"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("services.namePlaceholder")}
              maxLength={255}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="svcDescription">{t("services.descriptionLabel")}</Label>
            <Textarea
              id="svcDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={2}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="svcBranch">{t("services.branchLabel")}</Label>
            <Select value={branchId} onValueChange={(v) => setBranchId(v as string)}>
              <SelectTrigger id="svcBranch" className="w-full border-glass-border bg-glass-fill">
                <SelectValue placeholder={t("services.branchPlaceholder")}>
                  {(value: string | null) => branches.find((b) => b.id === value)?.name ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="svcCategory">{t("services.categoryLabel")}</Label>
            <Select value={categoryId} onValueChange={(v) => setCategoryId(v as string)}>
              <SelectTrigger id="svcCategory" className="w-full border-glass-border bg-glass-fill">
                <SelectValue placeholder={t("services.categoryPlaceholder")}>
                  {(value: string | null) =>
                    value === NO_CATEGORY || !value
                      ? t("services.categoryNone")
                      : categories.find((c) => c.id === value)?.name ?? value
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CATEGORY}>{t("services.categoryNone")}</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="svcDuration">{t("services.durationLabel")}</Label>
              <Input
                id="svcDuration"
                type="number"
                min={1}
                max={1440}
                required
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="svcCurrency">{t("services.currencyLabel")}</Label>
              <Input
                id="svcCurrency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                maxLength={3}
                placeholder="USD"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="svcPrice">{t("services.priceLabel")}</Label>
              <Input
                id="svcPrice"
                type="number"
                min={0}
                step="0.01"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="svcDeposit">{t("services.depositLabel")}</Label>
              <Input
                id="svcDeposit"
                type="number"
                min={0}
                step="0.01"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder={t("services.depositPlaceholder")}
              />
            </div>
          </div>
          {error && <p className="text-[13px] text-destructive">{error}</p>}
          <Button type="submit" disabled={!name.trim() || !branchId || loading} className="w-full rounded-full">
            {loading ? t("services.saving") : isEdit ? t("common.save") : t("services.addSubmit")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
