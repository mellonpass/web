import {
  derived,
  get,
  writable,
  type Readable,
  type Writable,
} from "svelte/store";
import type { SymmetricKey } from "./models/keys";
import {
  CipherCategory,
  type Cipher,
  type Organization,
  type VaultItem,
} from "./types";

export const categoryFilter: Writable<CipherCategory> = writable(
  CipherCategory.All
);
export const selectedVaultItem: Writable<VaultItem | null> = writable(null);
export const searchFilter: Writable<string | null> = writable(null);

export const newVaultItem: Writable<VaultItem | null> = writable(null);

// Declarative modal & command palette stores
export type ModalItemType = "card" | "login" | "secureNote" | "database" | null;
export const activeAddModal: Writable<ModalItemType> = writable(null);
export const isCommandPaletteOpen: Writable<boolean> = writable(false);
export const isPasswordGeneratorOpen: Writable<boolean> = writable(false);

const createEntityStore = <T extends { id?: string }>() => {
  const store = writable([] as Array<T>);

  return {
    ...store,
    add: (entity: T) => {
      store.update((items) => [...items, entity]);
    },
    edit: (entity: T) => {
      store.update((items) =>
        items.map((item) => (item.id === entity.id ? entity : item))
      );
    },
    remove: (id: string) => {
      store.update((items) => items.filter((item) => item.id !== id));
    },
    get: (id: string) => {
      const store_data = get(store);
      return store_data.find((i) => i.id == id);
    },
  };
};

export const cipherStore = createEntityStore<Cipher>();
// Full in-memory cache of all decrypted VaultItems so category switching is instant (<1ms)
export const allVaultItemsStore = createEntityStore<VaultItem>();
// Filtered vault list items for current category
export const vaultItemStore = createEntityStore<VaultItem>();

export type VaultContext = "ALL" | "PERSONAL" | string;

export interface OrganizationState {
  organizations: Organization[];
  activeOrganizationId: string | null; // null = Personal Vault or All Vaults
  vaultContext: VaultContext;
}

export function matchesVaultContext(
  item: {
    organization?: { id: string } | null;
    organizationId?: string | null;
  },
  context: VaultContext
): boolean {
  if (context === "ALL") return true;

  const isOrgItem = Boolean(item.organization?.id || item.organizationId);
  if (context === "PERSONAL") return !isOrgItem;

  if (item.organization?.id === context || item.organizationId === context) {
    return true;
  }

  if (item.organizationId) {
    try {
      const decoded = atob(context);
      if (decoded.endsWith(`:${item.organizationId}`)) {
        return true;
      }
    } catch {
      // Ignore non-base64 context IDs
    }
  }

  return false;
}

const createOrganizationStore = () => {
  const { subscribe, set, update } = writable<OrganizationState>({
    organizations: [],
    activeOrganizationId: null,
    vaultContext: "ALL",
  });

  // Decrypted Organization Symmetric Keys (OSKs) kept in memory only
  const decryptedKeys = new Map<string, SymmetricKey>();

  return {
    subscribe,
    setOrganizations: (organizations: Organization[]) => {
      const validIds = new Set(organizations.map((org) => org.id));
      for (const [id, osk] of decryptedKeys.entries()) {
        if (!validIds.has(id)) {
          try {
            osk.keybuffer.fill(0);
          } catch {}
          decryptedKeys.delete(id);
        }
      }
      update((state) => {
        const nextActiveId =
          state.activeOrganizationId &&
          !validIds.has(state.activeOrganizationId)
            ? null
            : state.activeOrganizationId;
        const nextContext =
          state.vaultContext !== "ALL" &&
          state.vaultContext !== "PERSONAL" &&
          !validIds.has(state.vaultContext)
            ? "ALL"
            : state.vaultContext;
        return {
          ...state,
          organizations,
          activeOrganizationId: nextActiveId,
          vaultContext: nextContext,
        };
      });
    },
    setVaultContext: (context: VaultContext) => {
      update((state) => ({
        ...state,
        vaultContext: context,
        activeOrganizationId:
          context === "ALL" || context === "PERSONAL" ? null : context,
      }));
    },
    setActiveOrganizationId: (orgId: string | null) => {
      update((state) => ({
        ...state,
        activeOrganizationId: orgId,
        vaultContext: orgId ?? "PERSONAL",
      }));
    },
    setDecryptedKey: (organizationId: string, osk: SymmetricKey) => {
      decryptedKeys.set(organizationId, osk);
    },
    getDecryptedKey: (organizationId: string): SymmetricKey | undefined => {
      return decryptedKeys.get(organizationId);
    },
    hasDecryptedKey: (organizationId: string): boolean => {
      return decryptedKeys.has(organizationId);
    },
    removeDecryptedKey: (organizationId: string) => {
      const osk = decryptedKeys.get(organizationId);
      if (osk) {
        try {
          osk.keybuffer.fill(0);
        } catch {}
        decryptedKeys.delete(organizationId);
      }
    },
    clear: () => {
      for (const osk of decryptedKeys.values()) {
        try {
          osk.keybuffer.fill(0);
        } catch {}
      }
      decryptedKeys.clear();
      set({
        organizations: [],
        activeOrganizationId: null,
        vaultContext: "ALL",
      });
    },
  };
};

export const organizationStore = createOrganizationStore();

export const activeOrganization: Readable<Organization | null> = derived(
  organizationStore,
  ($state) =>
    $state.organizations.find((o) => o.id === $state.activeOrganizationId) ??
    null
);
