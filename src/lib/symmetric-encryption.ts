import {
  CipherType,
  VaultStatus,
  type Cipher,
  type CipherCardData,
  type CipherData,
  type CipherLoginData,
  type CipherSecureNoteData,
  type VaultContentData,
  type VaultData,
  type VaultItem,
} from "$lib/types";
import { extractCipherKey } from "./key-generation";
import type { CipherKey, SymmetricKey } from "./models/keys";

type EncrypyedCipherData = CipherData;

abstract class CipherEncryptor {
  protected cipherKey: CipherKey;
  protected encoder = new TextEncoder();

  constructor(cipherKey: CipherKey) {
    this.cipherKey = cipherKey;
  }

  abstract encryptData(data: CipherData): Promise<EncrypyedCipherData>;
}

class CardDataEncryptor extends CipherEncryptor {
  async encryptData(data: CipherCardData): Promise<EncrypyedCipherData> {
    return {
      name: await this.cipherKey.encrypt(this.encoder.encode(data.name)),
      number: await this.cipherKey.encrypt(this.encoder.encode(data.number)),
      brand: await this.cipherKey.encrypt(this.encoder.encode(data.brand)),
      expMonth: await this.cipherKey.encrypt(
        this.encoder.encode(data.expMonth)
      ),
      expYear: await this.cipherKey.encrypt(this.encoder.encode(data.expYear)),
      securityCode: await this.cipherKey.encrypt(
        this.encoder.encode(data.securityCode)
      ),
    };
  }
}

class LoginDataEncryptor extends CipherEncryptor {
  async encryptData(data: CipherLoginData): Promise<EncrypyedCipherData> {
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

class SecureNoteEncryptor extends CipherEncryptor {
  async encryptData(data: CipherSecureNoteData): Promise<EncrypyedCipherData> {
    return {
      note: await this.cipherKey.encrypt(this.encoder.encode(data.note)),
    } satisfies CipherSecureNoteData;
  }
}

const ENCRYPTOR_MAPPER: {
  [key: string]: (cipherKey: CipherKey) => CipherEncryptor;
} = {
  [CipherType.CARD]: (cipherKey: CipherKey) => new CardDataEncryptor(cipherKey),
  [CipherType.LOGIN]: (cipherKey: CipherKey) =>
    new LoginDataEncryptor(cipherKey),
  [CipherType.SECURE_NOTE]: (cipherKey: CipherKey) =>
    new SecureNoteEncryptor(cipherKey),
};

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
  const encoder = new TextEncoder();
  const encryptorFactory = ENCRYPTOR_MAPPER[type];
  const enryptor = encryptorFactory(ck);

  let encryptedData = await enryptor.encryptData(data);

  const pck = await sk.protectKey(ck);

  const cipher: Cipher = {
    type: type,
    key: pck.toBase64(),
    name: await ck.encrypt(encoder.encode(name)),
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
