"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, LifeBuoy, RefreshCw, Send } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { NewConversationButton } from "@/components/chat/new-conversation-button";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useActiveOrg } from "@/lib/stores/org-store";
import { useApi } from "@/lib/use-api";
import { useChatSocket, type ChatSocketEvent } from "@/lib/use-chat-socket";
import { apiFetch, ApiError } from "@/lib/api";
import { useLocaleStore, LOCALE_INTL_TAG } from "@/lib/stores/locale-store";
import { useT, type TranslateFn } from "@/lib/i18n/use-t";
import { cn } from "@/lib/utils";
import type { ChatConversation, ChatMessage, ChatMessageListOut } from "@/lib/types";

type LocalMessage = ChatMessage & { _status?: "pending" | "failed" };

export default function ChatPage() {
  return (
    <Suspense fallback={null}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const t = useT();
  const router = useRouter();
  const searchParams = useSearchParams();
  const startOrg = searchParams.get("startOrg");
  const intlTag = LOCALE_INTL_TAG[useLocaleStore((s) => s.locale)];
  const user = useAuthStore((s) => s.user);
  const activeOrg = useActiveOrg();
  const isStaffPlus = !!activeOrg && activeOrg.role !== "client";
  const isPlatformAdmin = !!user?.is_platform_admin;
  // Owner/admin/staff default to their business inbox, but they're also a
  // person who might want to message some other, unrelated business as a
  // customer — this toggle is the only way to reach their own personal
  // conversations without switching their active organization. Platform
  // admins get a third pill for the support inbox — every client's thread
  // with BookMe support, independent of any business.
  const [view, setView] = useState<"business" | "personal" | "support">(isStaffPlus ? "business" : "personal");
  const viewingBusinessInbox = isStaffPlus && view === "business";
  const viewingSupportInbox = isPlatformAdmin && view === "support";
  const viewingAsProvider = viewingBusinessInbox || viewingSupportInbox;
  const listKey = viewingBusinessInbox
    ? `/organizations/${activeOrg.id}/chat/conversations`
    : viewingSupportInbox
      ? "/chat/support/conversations"
      : "/chat/conversations";

  const { data: conversations, mutate: refreshList } = useApi<ChatConversation[]>(listKey);

  // Pinned explicitly once conversations first load — never silently swapped
  // out from under the user by the conversation list re-sorting itself when
  // an unrelated thread gets a new message (that reordering is exactly what
  // caused "chat opens and then shows a different, empty conversation").
  // Setting state directly during render (not in an effect) is React's own
  // documented pattern for "adjust state once new data arrives" — it bails
  // out and re-renders immediately, and the `activeId === null` guard makes
  // it fire exactly once. Skipped while a `startOrg` deep link is still
  // pending — that flow picks (or creates) the conversation itself below.
  const [activeId, setActiveId] = useState<string | null>(null);
  if (activeId === null && !startOrg && conversations && conversations.length > 0) {
    setActiveId(conversations[0].id);
  }
  const currentId = activeId;

  // Mobile is single-pane, so which conversation is *loaded* (activeId,
  // above) and which pane is *showing* are two different questions — the
  // desktop-style auto-select above always keeps one pinned, which would
  // otherwise make the list unreachable the instant a "back" tap set
  // activeId to null: this same render would just auto-select it right back.
  // Starts true so mobile opens on the list, matching every other chat app,
  // rather than dropping straight into whichever conversation is first.
  const [mobileShowList, setMobileShowList] = useState(true);

  // Deep link from a business's public page ("Message business") — creates
  // (or reuses) the conversation with that org, opens it, then strips the
  // param so refreshing doesn't re-trigger it.
  useEffect(() => {
    if (!startOrg) return;
    apiFetch<ChatConversation>("/chat/conversations", { method: "POST", body: { organization_id: startOrg } })
      .then((conversation) => {
        refreshList();
        setActiveId(conversation.id);
        setMobileShowList(false);
      })
      .catch(() => toast.error(t("chat.startFailed")))
      .finally(() => router.replace("/app/chat"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startOrg]);

  const messagesKey = currentId ? `/chat/conversations/${currentId}/messages` : null;
  const { data: messageData, isLoading: loadingMessages, error: messagesError, mutate: mutateMessages } =
    useApi<ChatMessageListOut>(messagesKey);
  const visibleMessages = (messageData?.messages ?? []) as LocalMessage[];

  const [body, setBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!currentId) return;
    // Zero the badge immediately — waiting on the network round-trip (or,
    // worse, on some unrelated revalidation to eventually catch up) is what
    // left the unread dot visibly stuck after a conversation was already read.
    refreshList(
      (prev) => prev?.map((c) => (c.id === currentId ? { ...c, unread_count: 0 } : c)),
      { revalidate: false },
    );
    apiFetch(`/chat/conversations/${currentId}/read`, { method: "POST" })
      .then(() => refreshList())
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleMessages.length]);

  function upsertMessage(msg: LocalMessage) {
    mutateMessages(
      (prev) => {
        if (!prev) return prev;
        const existingIdx = prev.messages.findIndex((m) => m.id === msg.id);
        if (existingIdx !== -1) {
          const copy = prev.messages.slice();
          copy[existingIdx] = { ...copy[existingIdx], ...msg };
          return { ...prev, messages: copy };
        }
        return { ...prev, messages: [...prev.messages, msg] };
      },
      { revalidate: false },
    );
  }

  function removeMessage(tempId: string) {
    mutateMessages(
      (prev) => (prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== tempId) } : prev),
      { revalidate: false },
    );
  }

  function markOwnMessagesRead(readAt: string) {
    mutateMessages(
      (prev) => {
        if (!prev || !user) return prev;
        const cutoff = new Date(readAt).getTime();
        let changed = false;
        const copy = prev.messages.map((m) => {
          if (m.sender_id === user.id && !m.read_at && new Date(m.created_at).getTime() <= cutoff) {
            changed = true;
            return { ...m, read_at: readAt };
          }
          return m;
        });
        return changed ? { ...prev, messages: copy } : prev;
      },
      { revalidate: false },
    );
  }

  const handleSocketEvent = useCallback(
    (event: ChatSocketEvent) => {
      if (event.type === "read") {
        if (event.conversation_id === currentId) markOwnMessagesRead(event.read_at);
        return;
      }
      // message event
      if (event.message.conversation_id !== currentId) {
        refreshList();
        return;
      }
      upsertMessage(event.message);
      refreshList();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentId, refreshList, user?.id],
  );

  const socketStatus = useChatSocket(currentId, handleSocketEvent);

  // Catch up on anything sent while the socket was down (server restart,
  // laptop sleep, flaky network) — without this, a reconnect resumes the
  // live stream but silently leaves a gap for whatever was missed in between.
  useEffect(() => {
    if (socketStatus === "open") mutateMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socketStatus]);

  async function sendMessage(text: string) {
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimistic: LocalMessage = {
      id: tempId,
      conversation_id: currentId as string,
      sender_id: user!.id,
      sender_role: activeOrg?.role ?? "client",
      sender_name: user!.full_name,
      body: text,
      created_at: new Date().toISOString(),
      read_at: null,
      _status: "pending",
    };
    upsertMessage(optimistic);

    try {
      const msg = await apiFetch<ChatMessage>(`/chat/conversations/${currentId}/messages`, {
        method: "POST",
        body: { body: text },
      });
      removeMessage(tempId);
      upsertMessage(msg);
      refreshList();
    } catch (err) {
      upsertMessage({ ...optimistic, _status: "failed" });
      throw err;
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!currentId || !body.trim()) return;
    const text = body;
    setBody("");
    try {
      await sendMessage(text);
    } catch (err) {
      toastSendError(err, t);
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (currentId && body.trim()) {
        const text = body;
        setBody("");
        sendMessage(text).catch((err) => toastSendError(err, t));
      }
    }
  }

  async function retryFailed(msg: LocalMessage) {
    removeMessage(msg.id);
    try {
      await sendMessage(msg.body);
    } catch (err) {
      toastSendError(err, t);
    }
  }

  const activeConversation = conversations?.find((c) => c.id === currentId) ?? null;

  function peerName(c: ChatConversation) {
    return viewingAsProvider ? c.client_name : c.organization_name;
  }

  function switchView(next: "business" | "personal" | "support") {
    if (next === view) return;
    setView(next);
    setActiveId(null);
  }

  async function contactSupport() {
    try {
      const conversation = await apiFetch<ChatConversation>("/chat/support", { method: "POST" });
      refreshList();
      setActiveId(conversation.id);
      setMobileShowList(false);
    } catch {
      toast.error(t("chat.startFailed"));
    }
  }

  return (
    <div className="flex h-[calc(100dvh-116px-env(safe-area-inset-top)-env(safe-area-inset-bottom))] gap-3.5 sm:h-[calc(100dvh-32px)]">
      <aside
        className={cn(
          "glass flex w-full shrink-0 flex-col overflow-hidden p-2 sm:w-[280px]",
          !mobileShowList && "hidden sm:flex",
        )}
      >
        <div className="flex items-center justify-between px-2 py-2">
          <h2 className="font-display text-sm font-bold text-ink">{t("chat.title")}</h2>
          {view === "personal" && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={contactSupport}
                title={t("chat.contactSupport")}
                className="flex size-7 items-center justify-center rounded-full text-sub transition-colors hover:bg-glass-fill-strong hover:text-ink"
              >
                <LifeBuoy className="size-4" />
              </button>
              <NewConversationButton
                onCreated={(id) => {
                  refreshList();
                  setActiveId(id);
                  setMobileShowList(false);
                }}
              />
            </div>
          )}
        </div>
        {(isStaffPlus || isPlatformAdmin) && (
          <div className="mb-1.5 flex gap-1 px-2">
            {isStaffPlus && (
              <button
                type="button"
                onClick={() => switchView("business")}
                className={cn(
                  "flex-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                  view === "business" ? "bg-brand text-brand-ink" : "bg-glass-fill text-sub hover:text-ink",
                )}
              >
                {t("chat.businessInbox")}
              </button>
            )}
            <button
              type="button"
              onClick={() => switchView("personal")}
              className={cn(
                "flex-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                view === "personal" ? "bg-brand text-brand-ink" : "bg-glass-fill text-sub hover:text-ink",
              )}
            >
              {t("chat.myConversations")}
            </button>
            {isPlatformAdmin && (
              <button
                type="button"
                onClick={() => switchView("support")}
                className={cn(
                  "flex-1 rounded-full px-2.5 py-1.5 text-[11.5px] font-semibold transition-colors",
                  view === "support" ? "bg-brand text-brand-ink" : "bg-glass-fill text-sub hover:text-ink",
                )}
              >
                {t("chat.supportInbox")}
              </button>
            )}
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {(conversations ?? []).map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActiveId(c.id);
                setMobileShowList(false);
              }}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[13px] p-2.5 text-left transition-colors",
                c.id === currentId ? "bg-brand/15" : "hover:bg-glass-fill",
              )}
            >
              <UserAvatar name={peerName(c)} size={40} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[13.5px] font-bold text-ink">{peerName(c)}</span>
                  {c.last_message_at && (
                    <span className="shrink-0 text-[10.5px] text-sub-2">
                      {new Date(c.last_message_at).toLocaleTimeString(intlTag, {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-[12px] text-sub">{c.last_message_preview ?? t("chat.noMessagesYet")}</span>
                  {c.unread_count > 0 && (
                    <span className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-extrabold text-brand-ink">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
          {conversations && conversations.length === 0 && (
            <p className="px-3 py-6 text-center text-[13px] text-sub">{t("chat.noConversations")}</p>
          )}
        </div>
      </aside>

      <div
        className={cn(
          "glass flex-1 flex-col overflow-hidden",
          mobileShowList ? "hidden sm:flex" : "flex",
        )}
      >
        {activeConversation ? (
          <>
            <div className="flex items-center justify-between gap-2.5 border-b border-glass-border px-4.5 py-3.5">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setMobileShowList(true)}
                  aria-label={t("chat.backToList")}
                  className="-ml-1 flex size-8 shrink-0 items-center justify-center rounded-full text-sub transition-colors hover:bg-glass-fill-strong hover:text-ink sm:hidden"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <UserAvatar name={peerName(activeConversation)} size={36} />
                <div className="text-[14px] font-bold text-ink">{peerName(activeConversation)}</div>
              </div>
              {(socketStatus === "reconnecting" || socketStatus === "connecting") && (
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-sub-2">
                  <RefreshCw className="size-3 animate-spin" /> {t("chat.reconnecting")}
                </span>
              )}
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5">
              {loadingMessages ? (
                <p className="text-center text-sm text-sub">{t("common.loading")}</p>
              ) : messagesError ? (
                <p className="text-center text-sm text-destructive">
                  {t("chat.loadFailed")}{" "}
                  <button type="button" onClick={() => mutateMessages()} className="underline">
                    {t("chat.retry")}
                  </button>
                </p>
              ) : visibleMessages.length === 0 ? (
                <p className="text-center text-sm text-sub">{t("chat.sayHello")}</p>
              ) : (
                visibleMessages.map((m) => {
                  const out = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={cn("mb-2.5 flex", out ? "justify-end" : "justify-start")}>
                      <div className={cn("flex max-w-[60%] flex-col", out ? "items-end" : "items-start")}>
                        <div
                          className={cn(
                            "rounded-[17px] px-3.5 py-2.5 text-[13.5px] leading-snug",
                            out
                              ? "rounded-br-[5px] bg-brand text-brand-ink"
                              : "rounded-bl-[5px] border border-glass-border bg-glass-fill-strong text-ink",
                            m._status === "pending" && "opacity-60",
                            m._status === "failed" && "border border-destructive/50 bg-destructive/10 text-destructive",
                          )}
                        >
                          {m.body}
                          <div className={cn("mt-1 text-right text-[10px] opacity-75", !out && "text-sub-2")}>
                            {new Date(m.created_at).toLocaleTimeString(intlTag, {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>
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
                        {out && !m._status && (
                          <span className="mt-0.5 text-[10px] text-sub-2">{m.read_at ? t("chat.read") : t("chat.sent")}</span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <form
              onSubmit={handleSend}
              className="flex items-center gap-2.5 border-t border-glass-border px-4.5 py-3.5"
            >
              <input
                ref={inputRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder={t("chat.messagePlaceholder")}
                className="flex-1 rounded-full border border-glass-border bg-glass-fill px-4 py-2.5 text-[13.5px] text-ink outline-none focus:border-brand focus:bg-glass-fill-strong"
              />
              <button
                type="submit"
                disabled={!body.trim()}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-brand-ink transition-transform hover:scale-105 disabled:opacity-50"
              >
                <Send className="size-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-sub">
            {conversations === undefined ? t("common.loading") : t("chat.selectConversation")}
          </div>
        )}
      </div>
    </div>
  );
}

function toastSendError(err: unknown, t: TranslateFn) {
  toast.error(err instanceof ApiError ? String(err.detail) : t("chat.sendFailed"));
}
