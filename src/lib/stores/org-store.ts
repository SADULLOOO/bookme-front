import { create } from "zustand";
import { apiFetch } from "@/lib/api";
import type { OrganizationWithRole } from "@/lib/types";

interface OrgState {
  organizations: OrganizationWithRole[];
  activeOrgId: string | null;
  loaded: boolean;

  loadOrganizations: () => Promise<void>;
  setActiveOrgId: (id: string) => void;
  reset: () => void;
}

export const useOrgStore = create<OrgState>()((set, get) => ({
  organizations: [],
  activeOrgId: null,
  loaded: false,

  loadOrganizations: async () => {
    const organizations = await apiFetch<OrganizationWithRole[]>("/organizations");
    set({
      organizations,
      activeOrgId: get().activeOrgId ?? organizations[0]?.id ?? null,
      loaded: true,
    });
  },

  setActiveOrgId: (id) => set({ activeOrgId: id }),

  reset: () => set({ organizations: [], activeOrgId: null, loaded: false }),
}));

export function useActiveOrg(): OrganizationWithRole | null {
  const { organizations, activeOrgId } = useOrgStore();
  return organizations.find((o) => o.id === activeOrgId) ?? null;
}
