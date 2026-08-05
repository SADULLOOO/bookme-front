"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";
import type { ClientPhone, PhoneShareStatus } from "@/lib/types";

export function PhoneRequestAction({
  organizationId,
  bookingId,
  clientId,
  status,
  onRequested,
}: {
  organizationId: string;
  bookingId: string;
  clientId: string;
  status: PhoneShareStatus | null;
  onRequested: () => void;
}) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);

  async function handleRequest() {
    setLoading(true);
    try {
      await apiFetch(`/organizations/${organizationId}/phone-requests`, {
        method: "POST",
        body: { booking_id: bookingId },
      });
      toast.success(t("phoneRequest.sent"));
      onRequested();
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  async function handleReveal() {
    setLoading(true);
    try {
      const data = await apiFetch<ClientPhone>(`/organizations/${organizationId}/clients/${clientId}/phone`);
      setPhone(data.phone);
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    } finally {
      setLoading(false);
    }
  }

  if (phone) {
    return (
      <a href={`tel:${phone}`} className="flex items-center gap-1 text-[11.5px] font-semibold text-brand">
        <Phone className="size-3" /> {phone}
      </a>
    );
  }

  if (status === "approved") {
    return (
      <button
        type="button"
        onClick={handleReveal}
        disabled={loading}
        className="flex items-center gap-1 text-[11.5px] font-semibold text-brand"
      >
        <Phone className="size-3" /> {t("phoneRequest.viewNumber")}
      </button>
    );
  }

  if (status === "pending") {
    return <span className="text-[11.5px] font-medium text-sub-2">{t("phoneRequest.pending")}</span>;
  }

  return (
    <button
      type="button"
      onClick={handleRequest}
      disabled={loading}
      className="flex items-center gap-1 text-[11.5px] font-semibold text-sub transition-colors hover:text-brand"
    >
      <Phone className="size-3" /> {t("phoneRequest.request")}
    </button>
  );
}
