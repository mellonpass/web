import {
  CipherType,
  VaultStatus,
  type Cipher,
  type CipherCardData,
  type CipherData,
  type CipherLoginData,
  type CipherSecuresNoteData,
  type VaultItemDetail,
  type VaultData,
  type VaultItem,
} from "$lib/types";
import { extractCipherKey } from "./key-generation";
import type { CipherKey, SymmetricKey } from "./models/keys";

// Use only for encrypted CipherData values.
type EncryptedCipherData = CipherData;

abstract class CipherEncryptor {
  protected cipherKey: CipherKey;
  protected encoder = new TextEncoder();

  constructor(cipherKey: CipherKey) {
    this.cipherKey = cipherKey;
  }

  abstract encryptData(data?: CipherData): Promise<EncryptedCipherData | null>;
}

class CardDataEncryptor extends CipherEncryptor {
  async encryptData(data: CipherCardData): Promise<EncryptedCipherData> {
    if (!data) {
      throw new Error("Card data is required for encryption.");
    }

    return {
      cardholderName: await this.cipherKey.encrypt(
        this.encoder.encode(data.cardholderName)
      ),
      number: await this.cipherKey.encrypt(this.encoder.encode(data.number)),
      brand: await this.cipherKey.encrypt(this.encoder.encode(data.brand)),
      expMonth: await this.cipherKey.encrypt(
        this.encoder.encode(data.expMonth)
      ),
      expYear: await this.cipherKey.encrypt(this.encoder.encode(data.expYear)),
      securityCode: await this.cipherKey.encrypt(
        this.encoder.encode(data.securityCode)
      ),
    } satisfies CipherCardData;
  }
}

class LoginDataEncryptor extends CipherEncryptor {
  async encryptData(data: CipherLoginData): Promise<EncryptedCipherData> {
    if (!data) {
      throw new Error("Login data is required for encryption.");
    }

    return {
      username: await this.cipherKey.encrypt(
        this.encoder.encode(data.username)
      ),
      password: await this.cipherKey.encrypt(
        this.encoder.encode(data.password)
      ),
    } satisfies CipherLoginData;
  }
}

// No encryption needed for secure notes data.
// This is only a placeholder for behavioral consistency.
class SecureNotesDataEncryptor extends CipherEncryptor {
  async encryptData(_?: CipherSecuresNoteData): Promise<null> {
    return null;
  }
}

const ENCRYPTOR_FACTORY: Record<
  CipherType,
  (cipherKey: CipherKey) => CipherEncryptor
> = {
  [CipherType.CARD]: (cipherKey: CipherKey) => new CardDataEncryptor(cipherKey),
  [CipherType.LOGIN]: (cipherKey: CipherKey) =>
    new LoginDataEncryptor(cipherKey),
  [CipherType.SECURE_NOTE]: (cipherKey: CipherKey) =>
    new SecureNotesDataEncryptor(cipherKey),
};

export async function encryptCipher({
  sk,
  ck,
  name,
  notes,
  type,
  status,
  isFavorite,
  data,
}: {
  sk: SymmetricKey;
  ck: CipherKey;
  name: string;
  notes: string;
  type: CipherType;
  status: VaultStatus;
  isFavorite: boolean;
  data?: CipherData;
}): Promise<Cipher> {
  const encoder = new TextEncoder();
  const encryptorFactory = ENCRYPTOR_FACTORY[type];
  const encryptor = encryptorFactory(ck);
  const encryptedData = await encryptor.encryptData(data);

  const pck = await sk.protectKey(ck);

  const cipher: Cipher = {
    type: type,
    key: pck.toBase64(),
    name: await ck.encrypt(encoder.encode(name)),
    notes: await ck.encrypt(encoder.encode(notes)),
    isFavorite: await ck.encrypt(encoder.encode(isFavorite.toString())),
    status: await ck.encrypt(encoder.encode(status)),
    data: encryptedData,
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
    notes: await ck.decryptText(cipher.notes),
  };

  // FIXME: refactor by using hashmap.
  switch (cipher.type) {
    case CipherType.LOGIN:
      const loginData = cipher.data as CipherLoginData;
      vaultData.content = await ck.decryptText(loginData.username);
      break;
    case CipherType.CARD:
      const cipherCardData = cipher.data as CipherCardData;
      vaultData.content = await ck.decryptText(cipherCardData.cardholderName);
      break;
  }

  return vaultData as VaultItem;
}

export async function decryptCipherForVaultContent<T extends CipherData>(
  sk: SymmetricKey,
  cipher: Cipher
): Promise<VaultItemDetail<T>> {
  const ck = await extractCipherKey(sk, cipher.key);

  const vaultItemDetail = {
    id: cipher.id!,
    type: cipher.type,
    isFavorite: (await ck.decryptText(cipher.isFavorite)) == "true",
    status: <VaultStatus>await ck.decryptText(cipher.status),
    name: await ck.decryptText(cipher.name),
    notes: await ck.decryptText(cipher.notes),
    created: new Date(cipher.created!),
    updated: new Date(cipher.updated!),
  } satisfies Partial<VaultItemDetail<T>>;

  let data: any;

  // FIXME: refactor by using hashmap.
  switch (cipher.type) {
    case CipherType.LOGIN:
      const loginData = cipher.data as CipherLoginData;
      data = {
        username: await ck.decryptText(loginData.username),
        password: await ck.decryptText(loginData.password),
      } satisfies CipherLoginData;
      break;
    case CipherType.CARD:
      const cardData = cipher.data as CipherCardData;
      data = {
        cardholderName: await ck.decryptText(cardData.cardholderName),
        number: await ck.decryptText(cardData.number),
        brand: await ck.decryptText(cardData.brand),
        expMonth: await ck.decryptText(cardData.expMonth),
        expYear: await ck.decryptText(cardData.expYear),
        securityCode: await ck.decryptText(cardData.securityCode),
      } satisfies CipherCardData;
      break;
  }

  return { ...vaultItemDetail, data: data } satisfies VaultItemDetail<T>;
}
