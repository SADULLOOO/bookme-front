"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { useT } from "@/lib/i18n/use-t";
import { verticalMeta } from "@/lib/verticals";
import type { ChatConversation, PublicOrganizationSummary } from "@/lib/types";

export function NewConversationButton({ onCreated }: { onCreated: (id: string) => void }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicOrganizationSummary[]>([]);
  const [busy, setBusy] = useState(false);

  async function search(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    try {
      const data = await apiFetch<PublicOrganizationSummary[]>(
        `/public/organizations?q=${encodeURIComponent(q)}&limit=6`,
        { auth: false },
      );
      setResults(data);
    } catch {
      setResults([]);
    }
  }

  async function start(orgId: string) {
    setBusy(true);
    try {
      const conversation = await apiFetch<ChatConversation>("/chat/conversations", {
        method: "POST",
        body: { organization_id: orgId },
      });
      onCreated(conversation.id);
      setOpen(false);
      setQuery("");
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className="flex size-7 items-center justify-center rounded-full text-sub transition-colors hover:bg-glass-fill-strong hover:text-ink">
        <Plus className="size-4" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("chat.messageBusiness")}</DialogTitle>
        </DialogHeader>
        <input
          autoFocus
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder={t("chat.searchBusinesses")}
          className="w-full rounded-lg border border-glass-border bg-glass-fill px-3 py-2 text-sm text-ink outline-none focus:border-brand"
        />
        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
          {results.map((org) => (
            <button
              key={org.id}
              type="button"
              disabled={busy}
              onClick={() => start(org.id)}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm hover:bg-glass-fill disabled:opacity-50"
            >
              <span className="font-semibold text-ink">{org.name}</span>
              <span className="text-xs text-sub-2">{t(verticalMeta(org.business_type).labelKey)}</span>
            </button>
          ))}
          {query && results.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-sub">{t("chat.noBusinessesFound")}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
