import {
  CipherType,
  type Cipher,
  type CipherData,
  type CipherLoginData,
  type CipherSecureNoteData,
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
}: {
  sk: SymmetricKey;
  ck: CipherKey;
  name: string;
  type: CipherType;
  data: CipherData;
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
    isFavorite: false,
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
    name: await ck.decryptText(cipher.name),
    selected: false,
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
