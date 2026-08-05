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
import { BusinessCreateForm } from "@/components/business-create-form";
import { useT } from "@/lib/i18n/use-t";

export function CreateBusinessDialog({ trigger }: { trigger: React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("business.dialogTitle")}</DialogTitle>
          <DialogDescription>{t("business.dialogSubtitle")}</DialogDescription>
        </DialogHeader>
        <BusinessCreateForm
          onSubmitted={(application) => {
            setOpen(false);
            toast.success(t("business.submittedToast", { name: application.business_name }));
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
