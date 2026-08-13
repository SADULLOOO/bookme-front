"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tags, Trash2 } from "lucide-react";
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
import { apiFetch, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";
import type { ServiceCategory } from "@/lib/types";

export function ServiceCategoriesDialog({
  trigger,
  organizationId,
  categories,
  onChanged,
}: {
  trigger: React.ReactNode;
  organizationId: string;
  categories: ServiceCategory[];
  onChanged: () => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setAdding(true);
    try {
      await apiFetch(`/organizations/${organizationId}/service-categories`, {
        method: "POST",
        body: { name: name.trim() },
      });
      toast.success(t("serviceCategories.created"));
      setName("");
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("serviceCategories.createFailed"));
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(category: ServiceCategory) {
    setRemovingId(category.id);
    try {
      await apiFetch(`/organizations/${organizationId}/service-categories/${category.id}`, { method: "DELETE" });
      toast.success(t("serviceCategories.deleted"));
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("serviceCategories.deleteFailed"));
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Dialog>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("serviceCategories.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("serviceCategories.dialogSubtitle")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("serviceCategories.addPlaceholder")}
            maxLength={255}
            className="flex-1"
          />
          <Button type="submit" disabled={!name.trim() || adding} className="shrink-0 rounded-full px-4">
            {t("serviceCategories.add")}
          </Button>
        </form>

        <div className="flex flex-col gap-1.5">
          {categories.length === 0 ? (
            <p className="py-3 text-center text-[13px] text-sub">{t("serviceCategories.empty")}</p>
          ) : (
            categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-glass-border bg-glass-fill px-3 py-2"
              >
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
                  <Tags className="size-3.5 text-sub-2" />
                  {category.name}
                </span>
                <button
                  type="button"
                  disabled={removingId === category.id}
                  onClick={() => handleRemove(category)}
                  className="flex size-7 items-center justify-center rounded-md text-sub transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  aria-label={t("serviceCategories.deleteAria", { name: category.name })}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
