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
export const isCreateOrgModalOpen: Writable<boolean> = writable(false);
export const isOrgAdminModalOpen: Writable<boolean> = writable(false);
export const isAcceptInviteModalOpen: Writable<boolean> = writable(false);

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

export type VaultContext = "ALL" | "PERSONAL" | (string & {});

export interface OrganizationState {
  organizations: Organization[];
  activeOrganizationId: string | null; // null = Personal Vault or All Vaults
  vaultContext: VaultContext;
  decryptedKeyIds: string[];
}

function isGlobalIdForUuid(globalId: string, uuid: string): boolean {
  try {
    return atob(globalId) === `Organization:${uuid}`;
  } catch {
    return false;
  }
}

/**
 * Resolves an organization from a list using either its Relay GlobalID or raw UUID.
 */
export function findOrganizationById(
  organizations: Organization[],
  idOrUuid: string | null | undefined
): Organization | null {
  if (!idOrUuid) return null;
  return (
    organizations.find(
      (org) => org.id === idOrUuid || isGlobalIdForUuid(org.id, idOrUuid)
    ) ?? null
  );
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

  if (item.organizationId && isGlobalIdForUuid(context, item.organizationId)) {
    return true;
  }

  if (
    item.organization?.id &&
    isGlobalIdForUuid(item.organization.id, context)
  ) {
    return true;
  }

  return false;
}

function zeroKeyBuffer(osk: SymmetricKey): void {
  try {
    osk.keybuffer.fill(0);
  } catch {}
}

const createOrganizationStore = () => {
  const { subscribe, set, update } = writable<OrganizationState>({
    organizations: [],
    activeOrganizationId: null,
    vaultContext: "ALL",
    decryptedKeyIds: [],
  });

  // Decrypted Organization Symmetric Keys (OSKs) kept in memory only
  const decryptedKeys = new Map<string, SymmetricKey>();

  return {
    subscribe,
    setOrganizations: (organizations: Organization[]) => {
      const validIds = new Set(organizations.map((org) => org.id));
      for (const [id, osk] of decryptedKeys.entries()) {
        if (!validIds.has(id)) {
          zeroKeyBuffer(osk);
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
          decryptedKeyIds: Array.from(decryptedKeys.keys()),
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
    syncContextForItem: (organizationId: string | null) => {
      const targetContext = organizationId ?? "PERSONAL";
      update((state) => {
        if (
          state.vaultContext === "ALL" ||
          state.vaultContext === targetContext
        ) {
          return state;
        }
        return {
          ...state,
          vaultContext: targetContext,
          activeOrganizationId: organizationId,
        };
      });
    },
    setActiveOrganizationId: (orgId: string | null) => {
      update((state) => ({
        ...state,
        activeOrganizationId: orgId,
        vaultContext: orgId ?? "PERSONAL",
      }));
    },
    setDecryptedKey: (organizationId: string, osk: SymmetricKey) => {
      const existing = decryptedKeys.get(organizationId);
      if (existing && existing !== osk) {
        zeroKeyBuffer(existing);
      }
      decryptedKeys.set(organizationId, osk);
      update((state) => ({
        ...state,
        decryptedKeyIds: Array.from(decryptedKeys.keys()),
      }));
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
        zeroKeyBuffer(osk);
        decryptedKeys.delete(organizationId);
        update((state) => ({
          ...state,
          decryptedKeyIds: Array.from(decryptedKeys.keys()),
        }));
      }
    },
    clear: () => {
      for (const osk of decryptedKeys.values()) {
        zeroKeyBuffer(osk);
      }
      decryptedKeys.clear();
      set({
        organizations: [],
        activeOrganizationId: null,
        vaultContext: "ALL",
        decryptedKeyIds: [],
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
