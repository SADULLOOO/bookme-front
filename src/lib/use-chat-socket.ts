import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { ChatMessage } from "@/lib/types";

export type ChatSocketEvent =
  | { type: "message"; message: ChatMessage }
  | { type: "read"; conversation_id: string; reader_role: string; read_at: string };

export type ChatSocketStatus = "connecting" | "open" | "reconnecting" | "closed";

const MAX_BACKOFF_MS = 10_000;

/** Live inbound messages + read receipts for the open conversation. Sending
 * stays on the REST endpoint (which also broadcasts) — this hook only needs
 * to receive. Reconnects automatically with backoff if the connection drops
 * (server restart, network blip, laptop sleep). */
export function useChatSocket(conversationId: string | null, onEvent: (event: ChatSocketEvent) => void) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const handlerRef = useRef(onEvent);
  const [status, setStatus] = useState<ChatSocketStatus>("closed");

  useEffect(() => {
    handlerRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!conversationId || !accessToken) {
      return;
    }

    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempt = 0;
    let cancelled = false;

    function connect() {
      if (cancelled) return;
      setStatus(attempt === 0 ? "connecting" : "reconnecting");

      const wsUrl = `${API_URL.replace(/^http/, "ws")}/ws/chat/${conversationId}?token=${encodeURIComponent(accessToken as string)}`;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        attempt = 0;
        setStatus("open");
      };

      socket.onmessage = (event) => {
        try {
          handlerRef.current(JSON.parse(event.data) as ChatSocketEvent);
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = (event) => {
        if (cancelled) return;
        setStatus("reconnecting");
        // 4401/4403/4404 are auth/permission/not-found — retrying won't help.
        if (event.code === 4401 || event.code === 4403 || event.code === 4404) {
          setStatus("closed");
          return;
        }
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
  }, [conversationId, accessToken]);

  return !conversationId || !accessToken ? "closed" : status;
}
