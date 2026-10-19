import { extractSymmetricKey, generateCipherKey } from "$lib/key-generation";
import {
  allVaultItemsStore,
  cipherStore,
  vaultItemStore,
} from "$lib/stores";
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
    const createdCipher = response.data.cipher.create as Cipher;
    cipherStore.add(createdCipher);

    const createdVaultItem = await decryptCipherForVaultItem(sk, createdCipher);
    if (!createdVaultItem.content && content) {
      createdVaultItem.content = content;
    }
    allVaultItemsStore.add(createdVaultItem);
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

  const baseCipherData = {
    sk: sk,
    ck: ck,
    ...vaultDetail,
  };
  const _cipher: Cipher = await encryptCipher({ ...baseCipherData });
  return { ..._cipher, id: vaultDetail.id } as Cipher;
}

/**
 * Handle the cipher response payload by storing the cipher data
 * into the cipherStore, then decrypt the response payload and update
 * both allVaultItemsStore and vaultItemStore.
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
  allVaultItemsStore.edit(updatedVaultItem);
  vaultItemStore.edit(updatedVaultItem);

  return await decryptCipherForVaultContent<T>(sk, cipher);
}
