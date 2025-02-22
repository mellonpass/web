import { get, writable, type Writable } from "svelte/store";
import { CipherCategory, type Cipher, type VaultItem } from "./types";

export const categoryFilter: Writable<CipherCategory> = writable(
  CipherCategory.All
);

const _CipherStore = () => {
  const store = writable([] as Array<Cipher>);

  return {
    ...store,
    add: (cipher: Cipher) => {
      const store_data = get(store);
      store_data.push(cipher);
      store.set(store_data);
    },
    edit: (cipher: Cipher) => {
      const store_data = get(store);
      let index = store_data.findIndex((item) => item.id == cipher.id);
      if (index !== -1) {
        store_data[index] = cipher;
        store.set(store_data);
      }
    },
    get: (id: string) => {
      const store_data = get(store);
      return store_data.find((i) => i.id == id);
    },
  };
};

const _VaultItemStore = () => {
  const store = writable([] as Array<VaultItem>);

  return {
    ...store,
    add: (vaultItem: VaultItem) => {
      const store_data = get(store);
      store_data.push(vaultItem);
      store.set(store_data);
    },
    edit: (vaultItem: VaultItem) => {
      const store_data = get(store);
      let index = store_data.findIndex((item) => item.id == vaultItem.id);
      if (index !== -1) {
        store_data[index] = vaultItem;
        store.set(store_data);
      }
    },
    get: (id: string) => {
      const store_data = get(store);
      return store_data.find((i) => i.id == id);
    },
  };
};

export const cipherStore = _CipherStore();
export const vaultItemStore = _VaultItemStore();
