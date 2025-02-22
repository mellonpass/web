import { get, writable, type Writable } from "svelte/store";
import { CipherCategory, type Cipher, type VaultItem } from "./types";

export const newVaultItemSignal: Writable<VaultItem | null> = writable(null);

export const categoryFilter: Writable<CipherCategory> = writable(
  CipherCategory.All
);

const _CipherStore = () => {
  const store = writable([] as Array<Cipher>);

  return {
    ...store,
    add: (cipher: Cipher) => {
      const ciphers = get(store);
      ciphers.push(cipher);
      store.set(ciphers);
    },
    edit: (cipher: Cipher) => {
      const ciphers = get(store);
      let index = ciphers.findIndex((item) => item.id == cipher.id);
      if (index !== -1) {
        ciphers[index] = cipher;
        store.set(ciphers);
      }
    },
    get: (id: string) => {
      const ciphers = get(store);
      return ciphers.find((i) => i.id == id);
    },
  };
};

export const cipherStore = _CipherStore();
