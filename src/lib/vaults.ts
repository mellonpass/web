import { get } from "svelte/store";
import { extractSymmetricKey, generateCipherKey } from "$lib/key-generation";
import {
  allVaultItemsStore,
  cipherStore,
  organizationStore,
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

/**
 * Resolves the appropriate SymmetricKey for a cipher or vault item.
 * Returns the organization's decrypted OSK when the item belongs to an organization,
 * or falls back to the user's personal SymmetricKey for personal items.
 */
export function resolveCipherSymmetricKey(
  item:
    | {
        organization?: { id: string } | null;
        organizationId?: string | null;
      }
    | null
    | undefined,
  personalSk: SymmetricKey
): SymmetricKey {
  const orgGlobalId = item?.organization?.id;
  const orgRawId = item?.organizationId;

  if (!orgGlobalId && !orgRawId) {
    return personalSk;
  }

  if (orgGlobalId) {
    const keyByGlobalId = organizationStore.getDecryptedKey(orgGlobalId);
    if (keyByGlobalId) return keyByGlobalId;
  }

  if (orgRawId) {
    const keyByRawId = organizationStore.getDecryptedKey(orgRawId);
    if (keyByRawId) return keyByRawId;

    const orgs = get(organizationStore).organizations;
    for (const org of orgs) {
      if (org.id === orgRawId) {
        const key = organizationStore.getDecryptedKey(org.id);
        if (key) return key;
      }
      try {
        const decoded = atob(org.id);
        if (decoded.endsWith(`:${orgRawId}`)) {
          const key = organizationStore.getDecryptedKey(org.id);
          if (key) return key;
        }
      } catch {
        // Ignore non-base64 IDs
      }
    }
  }

  throw new Error(
    "Organization encryption key is not available. Please unlock or reload your vault."
  );
}

export async function createVaultItem({
  mk,
  epsk,
  name,
  notes,
  content,
  itemData,
  cipherType,
  organizationId = null,
}: {
  mk: string;
  epsk: string;
  name: string;
  notes: string;
  content: string;
  cipherType: CipherType;
  itemData?: CipherData;
  organizationId?: string | null;
}): Promise<VaultItem> {
  const sk = await extractSymmetricKey(mk, epsk);
  const targetSk = organizationId
    ? resolveCipherSymmetricKey(
        { organization: { id: organizationId }, organizationId },
        sk
      )
    : sk;
  const ck = await generateCipherKey();

  const cipher = await encryptCipher({
    sk: targetSk,
    ck: ck,
    name: name,
    notes: notes,
    type: cipherType,
    isFavorite: false,
    status: VaultStatus.ACTIVE,
    data: itemData,
  });

  if (organizationId) {
    cipher.organizationId = organizationId;
  }

  const response = await createCipher(cipher);

  if (response.data.cipher.create.__typename == "Cipher") {
    const createdCipher = response.data.cipher.create as Cipher;
    cipherStore.add(createdCipher);

    const createdVaultItem = await decryptCipherForVaultItem(
      targetSk,
      createdCipher
    );
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
  const effectiveSk = resolveCipherSymmetricKey(encryptedCipher, sk);
  return await decryptCipherForVaultContent<T>(effectiveSk, encryptedCipher);
}

export async function encryptVaultDetailForUpdate<T extends CipherData>({
  vaultDetail,
  sk,
}: {
  vaultDetail: VaultItemDetail<T>;
  sk: SymmetricKey;
}): Promise<Cipher> {
  const effectiveSk = resolveCipherSymmetricKey(vaultDetail, sk);
  const ck = await generateCipherKey();

  const baseCipherData = {
    sk: effectiveSk,
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
  const effectiveSk = resolveCipherSymmetricKey(cipher, sk);
  cipherStore.edit(cipher);

  const updatedVaultItem = await decryptCipherForVaultItem(effectiveSk, cipher);
  allVaultItemsStore.edit(updatedVaultItem);
  vaultItemStore.edit(updatedVaultItem);

  return await decryptCipherForVaultContent<T>(effectiveSk, cipher);
}
