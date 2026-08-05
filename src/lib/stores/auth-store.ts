import { create } from "zustand";
import { persist } from "zustand/middleware";
import { apiFetch } from "@/lib/api";
import { useOrgStore } from "@/lib/stores/org-store";
import type { User } from "@/lib/types";

interface TokenPair {
  access_token: string;
  refresh_token: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;

  setHydrated: () => void;
  setTokens: (access: string, refresh: string) => void;
  clearSession: () => void;
  fetchMe: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      hydrated: false,

      // Uses the creator's own `set` closure, not the exported `useAuthStore`
      // binding — persist's rehydration runs synchronously for localStorage,
      // inside the `create(...)` call itself, before that export is assigned.
      // Referencing `useAuthStore` here throws "Cannot access before
      // initialization" and silently kills hydration forever.
      setHydrated: () => set({ hydrated: true }),

      setTokens: (accessToken, refreshToken) => set({ accessToken, refreshToken }),

      // Always clears useOrgStore too — without this, switching accounts in
      // the same tab (logout, or straight into a different login) left the
      // *previous* user's businesses and role cached: only the name updated
      // from the fresh fetchMe(), while the rail kept showing stale org data
      // (e.g. a staff account briefly rendered as "Owner" of someone else's
      // business, because org-store's `loaded` flag never got reset so
      // AppLayout's effect never re-fetched).
      clearSession: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        useOrgStore.getState().reset();
      },

      fetchMe: async () => {
        const user = await apiFetch<User>("/auth/me");
        set({ user });
      },

      login: async (email, password) => {
        useOrgStore.getState().reset();
        const tokens = await apiFetch<TokenPair>("/auth/login", {
          method: "POST",
          body: { email, password },
          auth: false,
        });
        set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
        await get().fetchMe();
      },

      logout: async () => {
        try {
          await apiFetch("/auth/logout", { method: "POST" });
        } catch {
          // best-effort — the session is cleared locally regardless
        }
        get().clearSession();
      },
    }),
    {
      name: "bookme-auth",
      partialize: (state) => ({ accessToken: state.accessToken, refreshToken: state.refreshToken }),
      onRehydrateStorage: () => (state, error) => {
        state?.setHydrated();
        if (!error && state?.accessToken) {
          // Deferred to a microtask: for synchronous storage (localStorage),
          // this whole callback runs inside the `create(...)` call itself,
          // before `useAuthStore` is assigned — apiFetch (via api.ts) reads
          // `useAuthStore.getState()` and would hit the same TDZ error.
          queueMicrotask(() => {
            state.fetchMe().catch(() => state.clearSession());
          });
        }
      },
    },
  ),
);
