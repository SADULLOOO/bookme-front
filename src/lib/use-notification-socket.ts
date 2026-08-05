import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { UserNotification } from "@/lib/types";

export type NotificationSocketEvent = { type: "notification"; notification: UserNotification };

const MAX_BACKOFF_MS = 10_000;

/** One persistent connection for the whole authenticated session — reconnects
 * with backoff on drop, same shape as useChatSocket. */
export function useNotificationSocket(onEvent: (event: NotificationSocketEvent) => void) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const handlerRef = useRef(onEvent);
  const [status, setStatus] = useState<"open" | "connecting" | "reconnecting" | "closed">("closed");

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!accessToken) return;

    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      setStatus(attempt === 0 ? "connecting" : "reconnecting");

      const wsUrl = `${API_URL.replace(/^http/, "ws")}/ws/notifications?token=${encodeURIComponent(accessToken as string)}`;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        attempt = 0;
        setStatus("open");
      };

      socket.onmessage = (event) => {
        try {
          handlerRef.current(JSON.parse(event.data) as NotificationSocketEvent);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = (event) => {
        if (cancelled) return;
        if (event.code === 4401) {
          setStatus("closed");
          return;
        }
        setStatus("reconnecting");
        const delay = Math.min(1000 * 2 ** attempt, MAX_BACKOFF_MS);
        attempt += 1;
        retryTimer = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket?.close();
      };
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [accessToken]);

  return !accessToken ? "closed" : status;
}
