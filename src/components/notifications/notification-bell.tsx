"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, BellRing, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiFetch, ApiError } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useNotificationSocket, type NotificationSocketEvent } from "@/lib/use-notification-socket";
import { useLocaleStore, LOCALE_INTL_TAG } from "@/lib/stores/locale-store";
import { useT, type TranslateFn } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { NotificationListOut, PhoneShareRequest, UserNotification } from "@/lib/types";

function timeAgo(iso: string, t: TranslateFn, intlTag: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return t("platform.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("platform.minsAgo", { n: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("platform.hoursAgo", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t("platform.daysAgo", { n: days });
  return new Date(iso).toLocaleDateString(intlTag, { month: "short", day: "numeric" });
}

/** Resolves a notification's params into locale-aware display values —
 * `start_time`/`date` become formatted local strings, `role` becomes the
 * translated role name — before handing off to t(title_key/body_key, …). */
function resolveParams(n: UserNotification, t: TranslateFn, intlTag: string): Record<string, string> {
  const params = { ...(n.params ?? {}) };
  if (params.start_time) {
    params.when = new Date(params.start_time).toLocaleString(intlTag, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (params.date) {
    params.date = new Date(params.date).toLocaleDateString(intlTag, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }
  if (params.role) {
    params.role = t(`role.${params.role}`);
  }
  return params;
}

function renderTitle(n: UserNotification, t: TranslateFn, intlTag: string): string {
  if (!n.title_key) return n.title;
  return t(n.title_key, resolveParams(n, t, intlTag));
}

function renderBody(n: UserNotification, t: TranslateFn, intlTag: string): string | null {
  if (!n.body_key) return n.body;
  return t(n.body_key, resolveParams(n, t, intlTag));
}

export function NotificationBell() {
  const t = useT();
  const intlTag = LOCALE_INTL_TAG[useLocaleStore((s) => s.locale)];
  const router = useRouter();
  const { data, mutate } = useApi<NotificationListOut>("/notifications");
  const { data: pendingPhoneRequests, mutate: mutatePendingPhone } = useApi<PhoneShareRequest[]>("/phone-requests/mine");
  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;
  const pendingPhoneRequestIds = new Set((pendingPhoneRequests ?? []).map((r) => r.id));

  const handleEvent = useCallback(
    (event: NotificationSocketEvent) => {
      if (event.type !== "notification") return;
      toast(renderTitle(event.notification, t, intlTag), {
        description: renderBody(event.notification, t, intlTag) ?? undefined,
      });
      mutate(
        (prev) =>
          prev
            ? {
                unread_count: prev.unread_count + 1,
                notifications: [event.notification, ...prev.notifications].slice(0, 30),
              }
            : prev,
        { revalidate: false },
      );
      if (event.notification.kind === "phone_share_requested") mutatePendingPhone();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useNotificationSocket(handleEvent);

  async function handleOpenNotification(n: UserNotification) {
    if (!n.read_at) {
      mutate(
        (prev) =>
          prev
            ? {
                unread_count: Math.max(0, prev.unread_count - 1),
                notifications: prev.notifications.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)),
              }
            : prev,
        { revalidate: false },
      );
      apiFetch(`/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    }
    if (n.link) router.push(n.link);
  }

  async function handleRespondPhoneRequest(requestId: string, approve: boolean) {
    try {
      await apiFetch(`/phone-requests/${requestId}/respond`, { method: "POST", body: { approve } });
      toast.success(approve ? t("notif.phoneShareApproved") : t("notif.phoneShareDeclined"));
      mutatePendingPhone(
        (prev) => (prev ? prev.filter((r) => r.id !== requestId) : prev),
        { revalidate: false },
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? String(err.detail) : t("common.somethingWrong"));
    }
  }

  async function handleMarkAllRead() {
    mutate(
      (prev) => (prev ? { unread_count: 0, notifications: prev.notifications.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })) } : prev),
      { revalidate: false },
    );
    apiFetch("/notifications/read-all", { method: "POST" }).catch(() => {});
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative flex size-9 shrink-0 items-center justify-center rounded-xl text-sub transition-colors hover:bg-glass-fill hover:text-ink">
        {unreadCount > 0 ? <BellRing className="size-[18px]" /> : <Bell className="size-[18px]" />}
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-brand px-1 text-[9px] font-extrabold text-brand-ink">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="right" sideOffset={10} className="w-[340px] p-0">
        <div className="flex items-center justify-between border-b border-glass-border px-3.5 py-2.5">
          <span className="font-display text-[13px] font-bold text-ink">{t("platform.notifications")}</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[11px] font-semibold text-brand"
            >
              <Check className="size-3" /> {t("platform.markAllRead")}
            </button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12.5px] text-sub">{t("platform.allCaughtUp")}</p>
          ) : (
            notifications.map((n) => {
              const title = renderTitle(n, t, intlTag);
              const body = renderBody(n, t, intlTag);
              const requestId = n.kind === "phone_share_requested" ? n.params?.request_id : undefined;
              const isActionablePhoneRequest = requestId && pendingPhoneRequestIds.has(requestId);
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex w-full items-start gap-2.5 border-b border-glass-border px-3.5 py-3 text-left transition-colors last:border-b-0 hover:bg-glass-fill",
                    !n.read_at && "bg-brand/5",
                  )}
                >
                  {!n.read_at && <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />}
                  <button
                    type="button"
                    onClick={() => handleOpenNotification(n)}
                    className={cn("min-w-0 flex-1 text-left", n.read_at && "pl-3.5")}
                  >
                    <span className="block text-[12.5px] font-bold text-ink">{title}</span>
                    {body && <span className="mt-0.5 block truncate text-[12px] text-sub">{body}</span>}
                    <span className="mt-0.5 block text-[10.5px] text-sub-2">{timeAgo(n.created_at, t, intlTag)}</span>
                  </button>
                  {isActionablePhoneRequest && requestId && (
                    <span className="flex shrink-0 gap-1.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleRespondPhoneRequest(requestId, true)}
                        className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-bold text-brand-ink"
                      >
                        {t("common.yes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRespondPhoneRequest(requestId, false)}
                        className="rounded-full border border-glass-border px-2.5 py-1 text-[11px] font-bold text-sub"
                      >
                        {t("common.no")}
                      </button>
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
