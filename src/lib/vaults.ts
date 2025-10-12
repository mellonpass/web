import { generateCipherKey } from "$lib/key-generation";
import { cipherStore, vaultItemStore } from "$lib/stores";
import {
  decryptCipherForVaultContent,
  decryptCipherForVaultItem,
  encryptCipher,
} from "$lib/symmetric-encryption";

import type { SymmetricKey } from "$lib/models/keys";
import type {
  Cipher,
  CipherData,
  VaultItemDetail,
  VaultItem,
} from "$lib/types";

export async function loadVaultItemDetailFromStore<T extends CipherData>(
  cipherId: string,
  sk: SymmetricKey
): Promise<VaultItemDetail<T>> {
  const encryptedCipher = cipherStore.get(cipherId)!;
  return await decryptCipherForVaultContent<T>(sk, encryptedCipher);
}

export async function encryptVaultDetailForUpdate<T extends CipherData>({
  vaultDetail,
  sk,
}: {
  vaultDetail: VaultItemDetail<T>;
  sk: SymmetricKey;
}): Promise<Cipher> {
  const ck = await generateCipherKey();

  let baseCipherData = {
    sk: sk,
    ck: ck,
    ...vaultDetail,
  };
  const _cipher: Cipher = await encryptCipher({ ...baseCipherData });
  return { ..._cipher, id: vaultDetail.id } as Cipher;
}

/**
 * Handle the cipher response payload by storing the cipher data
 * into the cipherStore, then decrypt the response payload and add
 * it into the vaultItemStore for updating the vault item list.
 * @param payload Cipher response payload.
 * @param sk SymmetricKey.
 */
export async function handleCipherResponse<T extends CipherData>(
  payload: any,
  sk: SymmetricKey
): Promise<VaultItemDetail<T>> {
  if (payload.__typename != "Cipher") {
    throw new Error(payload.message);
  }

  const cipher = payload as Cipher;
  cipherStore.edit(cipher);

  const updatedVaultItem = await decryptCipherForVaultItem(sk, cipher);
  vaultItemStore.edit(updatedVaultItem);

  return await decryptCipherForVaultContent<T>(sk, cipher);
}
