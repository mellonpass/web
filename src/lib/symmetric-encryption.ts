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

abstract class CipherEncryptor {
  protected cipherKey: CipherKey;
  protected encoder = new TextEncoder();

  constructor(cipherKey: CipherKey) {
    this.cipherKey = cipherKey;
  }

  /**
   * Encrpyts the given data using the cipher key before storing it in the database.
   * @param data
   */
  abstract encryptData(data?: CipherData): Promise<CipherData | null>;
  /**
   * Decrypts the given data for displaying in the vault content view.
   * @param data
   */
  abstract decryptDataForVaultContent(
    data?: CipherData
  ): Promise<CipherData | null>;
  /**
   * Decrypts the given data for displaying in the vault item list view.
   * @param data
   */
  abstract decryptDataForVaultItem(data?: CipherData): Promise<string>;
}

class CardDataEncryptor extends CipherEncryptor {
  async encryptData(data: CipherCardData): Promise<CipherData> {
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

  async decryptDataForVaultContent(data: CipherCardData): Promise<CipherData> {
    if (!data) {
      throw new Error("Card data is required for decryption.");
    }
    return {
      cardholderName: await this.cipherKey.decryptText(data.cardholderName),
      number: await this.cipherKey.decryptText(data.number),
      brand: await this.cipherKey.decryptText(data.brand),
      expMonth: await this.cipherKey.decryptText(data.expMonth),
      expYear: await this.cipherKey.decryptText(data.expYear),
      securityCode: await this.cipherKey.decryptText(data.securityCode),
    } satisfies CipherCardData;
  }

  async decryptDataForVaultItem(data: CipherCardData): Promise<string> {
    if (!data) {
      throw new Error("Card data is required for decryption.");
    }
    return await this.cipherKey.decryptText(data.cardholderName);
  }
}

class LoginDataEncryptor extends CipherEncryptor {
  async encryptData(data: CipherLoginData): Promise<CipherData> {
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
      authenticatorKey: await this.cipherKey.encrypt(
        this.encoder.encode(data.authenticatorKey)
      ),
    } satisfies CipherLoginData;
  }

  async decryptDataForVaultContent(data: CipherLoginData): Promise<CipherData> {
    if (!data) {
      throw new Error("Login data is required for decryption.");
    }

    return {
      username: await this.cipherKey.decryptText(data.username),
      password: await this.cipherKey.decryptText(data.password),
      authenticatorKey: await this.cipherKey.decryptText(data.authenticatorKey),
    } satisfies CipherLoginData;
  }

  async decryptDataForVaultItem(data: CipherLoginData): Promise<string> {
    if (!data) {
      throw new Error("Login data is required for decryption.");
    }
    return await this.cipherKey.decryptText(data.username);
  }
}

// No encryption needed for secure notes data.
// This is only a placeholder for behavioral consistency.
class SecureNotesDataEncryptor extends CipherEncryptor {
  async encryptData(_?: CipherSecuresNoteData): Promise<null> {
    return null;
  }
  async decryptDataForVaultContent(_?: CipherSecuresNoteData): Promise<null> {
    return null;
  }
  async decryptDataForVaultItem(_?: CipherSecuresNoteData): Promise<string> {
    return "";
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

/**
 * Decrypts a Cipher into a VaultItem displayed in the list (without full content).
 * @param sk SymmetricKey.
 * @param cipher Cipher to decrypt.
 * @returns VaultItem.
 */
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

  const encryptorFactory = ENCRYPTOR_FACTORY[cipher.type];
  const encryptor = encryptorFactory(ck);
  vaultData.content = await encryptor.decryptDataForVaultItem(cipher.data!);
  return vaultData as VaultItem;
}

/**
 * Decrypts a Cipher into a VaultItemDetail with full content.
 * @param sk SymmetricKey.
 * @param cipher Cipher to decrypt.
 * @returns VaultItemDetail.
 */
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

  const encryptorFactory = ENCRYPTOR_FACTORY[cipher.type];
  const encryptor = encryptorFactory(ck);

  let data: any = await encryptor.decryptDataForVaultContent(cipher.data!);
  return { ...vaultItemDetail, data: data } satisfies VaultItemDetail<T>;
}
