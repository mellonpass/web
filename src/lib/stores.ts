import { get, writable, type Writable } from "svelte/store";
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

export interface OrganizationState {
  organizations: Organization[];
  activeOrganizationId: string | null; // null = Personal Vault
}

const createOrganizationStore = () => {
  const { subscribe, set, update } = writable<OrganizationState>({
    organizations: [],
    activeOrganizationId: null,
  });

  // Decrypted Organization Symmetric Keys (OSKs) kept in memory only
  const decryptedKeys = new Map<string, SymmetricKey>();

  return {
    subscribe,
    setOrganizations: (organizations: Organization[]) => {
      update((state) => ({ ...state, organizations }));
    },
    setActiveOrganizationId: (orgId: string | null) => {
      update((state) => ({ ...state, activeOrganizationId: orgId }));
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
      decryptedKeys.delete(organizationId);
    },
    clear: () => {
      decryptedKeys.clear();
      set({
        organizations: [],
        activeOrganizationId: null,
      });
    },
  };
};

export const organizationStore = createOrganizationStore();
