import { get, writable, type Writable } from "svelte/store";
import { type Cipher, type VaultItem } from "./types";

export const newVaultItemSignal: Writable<VaultItem | null> = writable(null);

const _CipherStore = () => {
  const store = writable([] as Array<Cipher>);

  return {
    ...store,
    add: (cipher: Cipher) => {
      const ciphers = get(store);
      ciphers.push(cipher);
      store.set(ciphers);
    },
    get: (id: string) => {
      const ciphers = get(store);
      let index = ciphers.findIndex((i) => i.id == id);
      if (index !== -1) {
        return ciphers[index];
      }
    },
  };
};

export const cipherStore = _CipherStore();
