import {
  CipherStatus,
  CipherType,
  VaultStatus,
  type Cipher,
  type CipherData,
  type CipherLoginData,
  type CipherSecureNoteData,
  type VaultContentData,
  type VaultData,
  type VaultItem,
} from "$lib/types";
import { extractCipherKey } from "./key-generation";
import type { CipherKey, SymmetricKey } from "./models/keys";

export async function encryptCipher({
  sk,
  ck,
  name,
  type,
  data,
  status,
  isFavorite,
}: {
  sk: SymmetricKey;
  ck: CipherKey;
  name: string;
  type: CipherType;
  data: CipherData;
  status: VaultStatus;
  isFavorite: boolean;
}): Promise<Cipher> {
  const pck = await sk.protectKey(ck);
  const encoder = new TextEncoder();

  let encrpytedData: CipherData;

  switch (type) {
    case CipherType.LOGIN:
      data = data as CipherLoginData;
      const loginData: CipherLoginData = {
        username: await ck.encrypt(encoder.encode(data.username)),
        password: await ck.encrypt(encoder.encode(data.password)),
      };
      encrpytedData = loginData;
      break;
    case CipherType.SECURE_NOTE:
      data = data as CipherSecureNoteData;
      const secureNoteData: CipherSecureNoteData = {
        note: await ck.encrypt(encoder.encode(data.note)),
      };
      encrpytedData = secureNoteData;
      break;
    default:
      throw new Error("Unable to encrypt cipher! Unsupported cipher type.");
  }

  const cipher: Cipher = {
    type: type,
    key: pck.toBase64(),
    name: await ck.encrypt(encoder.encode(name)),
    isFavorite: await ck.encrypt(encoder.encode(isFavorite.toString())),
    status: await ck.encrypt(encoder.encode(status)),
    data: encrpytedData,
  };

  return cipher;
}

export async function decryptCipherForVaultItem(
  sk: SymmetricKey,
  cipher: Cipher
): Promise<VaultItem> {
  const ck = await extractCipherKey(sk, cipher.key);
  const vaultData: VaultData = {
    id: cipher.id!,
    type: cipher.type,
    isFavorite:
      (await ck.decryptText(cipher.isFavorite)).toLowerCase() == "true",
    status: <VaultStatus>await ck.decryptText(cipher.status),
    name: await ck.decryptText(cipher.name),
  };

  switch (cipher.type) {
    case CipherType.LOGIN:
      const loginData = cipher.data as CipherLoginData;
      vaultData.content = await ck.decryptText(loginData.username);
      break;

    default:
      const secureNoteData = cipher.data as CipherSecureNoteData;
      vaultData.content = await ck.decryptText(secureNoteData.note);
      break;
  }

  return vaultData as VaultItem;
}

export async function decryptCipherForVaultContent(
  sk: SymmetricKey,
  cipher: Cipher
): Promise<VaultContentData> {
  const ck = await extractCipherKey(sk, cipher.key);
  const vaultContent: Partial<VaultContentData> = {
    id: cipher.id!,
    type: cipher.type,
    isFavorite: (await ck.decryptText(cipher.isFavorite)) == "true",
    status: <VaultStatus>await ck.decryptText(cipher.status),
    name: await ck.decryptText(cipher.name),
  };

  switch (cipher.type) {
    case CipherType.LOGIN:
      const loginData = cipher.data as CipherLoginData;
      vaultContent.data = {
        username: await ck.decryptText(loginData.username),
        password: await ck.decryptText(loginData.password),
      };
      break;
    default:
      const secureNoteData = cipher.data as CipherSecureNoteData;
      vaultContent.data = {
        note: await ck.decryptText(secureNoteData.note),
      };
      break;
  }

  return { ...vaultContent } as VaultContentData;
}
