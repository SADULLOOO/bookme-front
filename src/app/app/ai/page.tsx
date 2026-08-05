"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Send, Sparkles } from "lucide-react";
import { AiMessageContent } from "@/components/ai-message-content";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useApi } from "@/lib/use-api";
import { apiFetch, ApiError } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { AiMessage } from "@/lib/types";

type LocalMessage = AiMessage & { _status?: "pending" | "failed" };

export default function AiAssistantPage() {
  const t = useT();
  const user = useAuthStore((s) => s.user);
  const { data: history } = useApi<AiMessage[]>("/ai/history");

  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (history && !loaded) {
      setMessages(history);
      setLoaded(true);
    }
  }, [history, loaded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sending]);

  async function send(text: string) {
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: LocalMessage = {
      id: tempId,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
      _status: "pending",
    };
    setMessages((prev) => [...prev, optimistic]);
    setSending(true);
    try {
      const res = await apiFetch<{ reply: AiMessage }>("/ai/chat", { method: "POST", body: { message: text } });
      setMessages((prev) => [
        ...prev.map((m) => (m.id === tempId ? { ...m, _status: undefined } : m)),
        res.reply,
      ]);
    } catch (err) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, _status: "failed" as const } : m)));
      toast.error(err instanceof ApiError ? String(err.detail) : t("ai.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || sending) return;
    const text = body;
    setBody("");
    await send(text);
    inputRef.current?.focus();
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey && body.trim() && !sending) {
      e.preventDefault();
      const text = body;
      setBody("");
      send(text);
    }
  }

  async function retryFailed(msg: LocalMessage) {
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    await send(msg.content);
  }

  return (
    <div className="flex h-[calc(100dvh-32px)] flex-col gap-3.5">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
          <Sparkles className="size-4.5" />
        </div>
        <div>
          <h1 className="font-display text-lg font-bold text-ink">{t("ai.title")}</h1>
          <p className="text-[12.5px] text-sub">{t("ai.subtitle")}</p>
        </div>
      </div>

      <div className="glass flex flex-1 flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
              <Sparkles className="size-6 text-sub-2" />
              <p className="max-w-xs text-sm text-sub">
                {t("ai.emptyState", { name: user?.full_name?.split(" ")[0] ?? "" })}
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const out = m.role === "user";
              return (
                <div key={m.id} className={cn("mb-2.5 flex", out ? "justify-end" : "justify-start")}>
                  <div className={cn("flex max-w-[75%] flex-col", out ? "items-end" : "items-start")}>
                    <div
                      className={cn(
                        "rounded-[17px] px-3.5 py-2.5 text-[13.5px]",
                        out
                          ? "rounded-br-[5px] bg-brand text-brand-ink"
                          : "rounded-bl-[5px] border border-glass-border bg-glass-fill-strong text-ink",
                        m._status === "pending" && "opacity-60",
                        m._status === "failed" && "border border-destructive/50 bg-destructive/10 text-destructive",
                      )}
                    >
                      {out ? m.content : <AiMessageContent content={m.content} />}
                    </div>
                    {out && m._status === "failed" && (
                      <button
                        type="button"
                        onClick={() => retryFailed(m)}
                        className="mt-1 flex items-center gap-1 text-[10.5px] font-semibold text-destructive"
                      >
                        <AlertCircle className="size-3" /> {t("chat.failedRetry")}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
          {sending && (
            <div className="mb-2.5 flex justify-start">
              <div className="flex items-center gap-1 rounded-[17px] rounded-bl-[5px] border border-glass-border bg-glass-fill-strong px-3.5 py-3">
                <span className="size-1.5 animate-bounce rounded-full bg-sub-2 [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-sub-2 [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-sub-2" />
              </div>
            </div>
          )}
        </div>
        <form onSubmit={handleSend} className="flex items-center gap-2.5 border-t border-glass-border px-4.5 py-3.5">
          <input
            ref={inputRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder={t("ai.messagePlaceholder")}
            disabled={sending}
            className="flex-1 rounded-full border border-glass-border bg-glass-fill px-4 py-2.5 text-[13.5px] text-ink outline-none focus:border-brand focus:bg-glass-fill-strong disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!body.trim() || sending}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink transition-transform hover:scale-105 disabled:opacity-50"
          >
            <Send className="size-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
