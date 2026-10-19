import {
  CipherType,
  VaultStatus,
  type Cipher,
  type CipherCardData,
  type CipherData,
  type CipherDatabaseData,
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
   * Encrypts the given data using the cipher key before storing it in the database.
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
    const brand = data.brand ? await this.cipherKey.decryptText(data.brand) : "";
    const number = data.number ? await this.cipherKey.decryptText(data.number) : "";
    const holder = data.cardholderName ? await this.cipherKey.decryptText(data.cardholderName) : "";
    const cleanNum = number.replace(/\s+/g, "");
    const last4 = cleanNum.length >= 4 ? `•••• ${cleanNum.slice(-4)}` : "";
    if (brand && last4) return `${brand} • ${last4}`;
    if (brand) return brand;
    if (last4) return last4;
    return holder;
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
        this.encoder.encode(data.authenticatorKey || "")
      ),
      url: data.url
        ? await this.cipherKey.encrypt(this.encoder.encode(data.url))
        : "",
    } satisfies CipherLoginData;
  }

  async decryptDataForVaultContent(data: CipherLoginData): Promise<CipherData> {
    if (!data) {
      throw new Error("Login data is required for decryption.");
    }

    return {
      username: await this.cipherKey.decryptText(data.username),
      password: await this.cipherKey.decryptText(data.password),
      authenticatorKey: data.authenticatorKey
        ? await this.cipherKey.decryptText(data.authenticatorKey)
        : "",
      url: data.url ? await this.cipherKey.decryptText(data.url) : "",
    } satisfies CipherLoginData;
  }

  async decryptDataForVaultItem(data: CipherLoginData): Promise<string> {
    if (!data) {
      throw new Error("Login data is required for decryption.");
    }
    return await this.cipherKey.decryptText(data.username);
  }
}

class DatabaseDataEncryptor extends CipherEncryptor {
  async encryptData(data: CipherDatabaseData): Promise<CipherData> {
    if (!data) {
      throw new Error("Database data is required for encryption.");
    }

    return {
      engine: await this.cipherKey.encrypt(this.encoder.encode(data.engine)),
      connectionType: await this.cipherKey.encrypt(
        this.encoder.encode(data.connectionType)
      ),
      url: data.url
        ? await this.cipherKey.encrypt(this.encoder.encode(data.url))
        : "",
      host: data.host
        ? await this.cipherKey.encrypt(this.encoder.encode(data.host))
        : "",
      port: data.port
        ? await this.cipherKey.encrypt(this.encoder.encode(data.port))
        : "",
      database: data.database
        ? await this.cipherKey.encrypt(this.encoder.encode(data.database))
        : "",
      username: data.username
        ? await this.cipherKey.encrypt(this.encoder.encode(data.username))
        : "",
      password: data.password
        ? await this.cipherKey.encrypt(this.encoder.encode(data.password))
        : "",
    } satisfies CipherDatabaseData;
  }

  async decryptDataForVaultContent(
    data: CipherDatabaseData
  ): Promise<CipherData> {
    if (!data) {
      throw new Error("Database data is required for decryption.");
    }

    return {
      engine: await this.cipherKey.decryptText(data.engine),
      connectionType: await this.cipherKey.decryptText(data.connectionType),
      url: data.url ? await this.cipherKey.decryptText(data.url) : "",
      host: data.host ? await this.cipherKey.decryptText(data.host) : "",
      port: data.port ? await this.cipherKey.decryptText(data.port) : "",
      database: data.database
        ? await this.cipherKey.decryptText(data.database)
        : "",
      username: data.username
        ? await this.cipherKey.decryptText(data.username)
        : "",
      password: data.password
        ? await this.cipherKey.decryptText(data.password)
        : "",
    } satisfies CipherDatabaseData;
  }

  async decryptDataForVaultItem(data: CipherDatabaseData): Promise<string> {
    if (!data) {
      throw new Error("Database data is required for decryption.");
    }
    const engine = await this.cipherKey.decryptText(data.engine);
    let extra = "";
    const connectionType = await this.cipherKey.decryptText(
      data.connectionType
    );
    if (connectionType === "URL") {
      const rawUrl = data.url ? await this.cipherKey.decryptText(data.url) : "";
      // Mask password in list preview if present in URL
      extra = rawUrl.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:••••@");
    } else {
      extra = data.host ? await this.cipherKey.decryptText(data.host) : "";
    }
    return engine + (extra ? ` • ${extra}` : "");
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
    return "Encrypted note";
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
  [CipherType.DATABASE]: (cipherKey: CipherKey) =>
    new DatabaseDataEncryptor(cipherKey),
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
    deleteOn: cipher.deleteOn ? new Date(cipher.deleteOn) : null,
    created: cipher.created ? new Date(cipher.created) : null,
    updated: cipher.updated ? new Date(cipher.updated) : null,
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
    deleteOn: cipher.deleteOn ? new Date(cipher.deleteOn) : null,
    created: cipher.created ? new Date(cipher.created) : new Date(),
    updated: cipher.updated ? new Date(cipher.updated) : new Date(),
  } satisfies Partial<VaultItemDetail<T>>;

  const encryptorFactory = ENCRYPTOR_FACTORY[cipher.type];
  const encryptor = encryptorFactory(ck);

  let data: any = await encryptor.decryptDataForVaultContent(cipher.data!);
  return { ...vaultItemDetail, data: data } satisfies VaultItemDetail<T>;
}
