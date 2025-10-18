import { extractSymmetricKey, generateCipherKey } from "$lib/key-generation";
import { cipherStore, vaultItemStore, newVaultItem } from "$lib/stores";
import {
  decryptCipherForVaultContent,
  decryptCipherForVaultItem,
  encryptCipher,
} from "$lib/symmetric-encryption";

import type { SymmetricKey } from "$lib/models/keys";
import {
  VaultStatus,
  type Cipher,
  type CipherData,
  type CipherType,
  type VaultItem,
  type VaultItemDetail,
} from "$lib/types";
import { createCipher } from "./services/ciphers";

export async function createVaultItem({
  mk,
  epsk,
  name,
  notes,
  content,
  itemData,
  cipherType,
}: {
  mk: string;
  epsk: string;
  name: string;
  notes: string;
  content: string;
  cipherType: CipherType;
  itemData?: CipherData;
}): Promise<VaultItem> {
  const sk = await extractSymmetricKey(mk, epsk);
  const ck = await generateCipherKey();

  const cipher = await encryptCipher({
    sk: sk,
    ck: ck,
    name: name,
    notes: notes,
    type: cipherType,
    isFavorite: false,
    status: VaultStatus.ACTIVE,
    data: itemData,
  });

  const response = await createCipher(cipher);

  if (response.data.cipher.create.__typename == "Cipher") {
    const createdCipher = response.data.cipher.create;
    cipherStore.add(createdCipher);

    const createdVaultItem = {
      id: createdCipher.id,
      type: cipherType,
      name: name,
      notes: notes,
      content: content,
      isFavorite: false,
      status: VaultStatus.ACTIVE,
    } satisfies VaultItem;
    return createdVaultItem;
  } else {
    throw new Error(response.data.cipher.create.message);
  }
}

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
