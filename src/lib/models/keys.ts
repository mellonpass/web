import { arrayBufferToHex, hexToArrayBuffer } from "$lib/bytes";

const BIT_SIZE = 8;

/**
 * Encrypted and signed cipher data.
 */
export class ProtectedData {
  data: Uint8Array;
  mac: Uint8Array;
  iv: Uint8Array;

  constructor(databuffer: Uint8Array) {
    const IV_START_LEN = databuffer.length - 16;
    const MAC_START_LEN = IV_START_LEN - 32;

    this.iv = databuffer.slice(IV_START_LEN, databuffer.byteLength);
    this.mac = databuffer.slice(MAC_START_LEN, IV_START_LEN);
    this.data = databuffer.slice(0, MAC_START_LEN);
  }
}

/**
 * Base key that imports AES and MAC keys from the keybuffer.
 */
abstract class BaseKey {
  protected aeskeyBuffer: Uint8Array;
  protected mackeyBuffer: Uint8Array;

  keybuffer: Uint8Array;

  constructor(keybuffer: Uint8Array) {
    this.keybuffer = keybuffer;
    this.aeskeyBuffer = keybuffer.slice(0, 32);
    this.mackeyBuffer = keybuffer.slice(32, 64);
  }

  protected async getAESKey(): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      "raw",
      this.aeskeyBuffer,
      { name: "AES-CTR" },
      false,
      ["encrypt", "decrypt"]
    );
  }

  protected async getMACKey(): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      "raw",
      this.mackeyBuffer,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    );
  }

  toBase64(): string {
    return btoa(arrayBufferToHex(this.keybuffer));
  }

  static fromBase64<T extends BaseKey>(
    this: new (encodedKey: Uint8Array) => T,
    encodedKey: string
  ): T {
    return new this(hexToArrayBuffer(atob(encodedKey)));
  }
}

/**
 * A key that can do AES encrypt-decrypt and HMAC sign-verify.
 */
export abstract class AESHMACKey extends BaseKey {
  constructor(keybuffer: Uint8Array) {
    super(keybuffer);
  }

  private async hmacSign(data: Uint8Array): Promise<Uint8Array> {
    const macKey = await this.getMACKey();
    const buffer = await crypto.subtle.sign("HMAC", macKey, data);
    return new Uint8Array(buffer);
  }

  private async hmacVerify(
    signature: Uint8Array,
    data: Uint8Array
  ): Promise<boolean> {
    const macKey = await this.getMACKey();
    return await crypto.subtle.verify("HMAC", macKey, signature, data);
  }

  protected async encryptSign(data: Uint8Array): Promise<Uint8Array> {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const counterLength = iv.byteLength * BIT_SIZE;

    const encBuffer = await crypto.subtle.encrypt(
      { name: "AES-CTR", counter: iv, length: counterLength },
      await this.getAESKey(),
      data
    );

    const buffer = new Uint8Array(encBuffer);
    const macInput = new Uint8Array([...buffer, ...iv]);
    const mac = await this.hmacSign(macInput);

    // combine data into a single byte.
    return new Uint8Array([...buffer, ...mac, ...iv]);
  }

  protected async verifyDecrypt(
    data: Uint8Array,
    mac: Uint8Array,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    const macInput = new Uint8Array([...data, ...iv]);
    const valid = await this.hmacVerify(mac, macInput);

    if (!valid) {
      throw new Error("Invalid MAC signature!");
    }

    const baseKey = await this.getAESKey();
    const counterLength = iv.byteLength * BIT_SIZE;
    // decrypted data key.
    const buffer = await crypto.subtle.decrypt(
      { name: "AES-CTR", counter: iv, length: counterLength },
      baseKey,
      data
    );

    return new Uint8Array(buffer);
  }

  /**
   * Encrypt binary data and base64 encode.
   * @param data
   * @returns Promise<string> - A base64 encoded string.
   */
  async encrypt(data: Uint8Array): Promise<string> {
    const buffer = await this.encryptSign(data);
    return btoa(arrayBufferToHex(buffer));
  }

  async decryptText(encodedData: string): Promise<string> {
    const data = atob(encodedData);
    // encrypted data | mac | iv
    const buffer = hexToArrayBuffer(data);
    const pData = new ProtectedData(buffer);
    const decryptedBuffer = await this.verifyDecrypt(
      pData.data,
      pData.mac,
      pData.iv
    );
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  }
}

/**
 * Generic Key wrapper that can protect (encrypt+sign) another key and extract
 * (verify+decrypt) a protected key.
 */
export abstract class Key<
  PK extends ProtectedKey,
  K extends AESHMACKey | Key<any, any>,
> extends AESHMACKey {
  protected abstract setProtectedKeyType(keybuffer: Uint8Array): PK;
  protected abstract getKeyType(keybuffer: Uint8Array): K;

  async protectKey(key: K): Promise<PK> {
    const pskBuffer = await this.encryptSign(key.keybuffer);
    return this.setProtectedKeyType(pskBuffer);
  }

  async extractKey(protectedKey: PK): Promise<K> {
    const decryptedBuffer = await this.verifyDecrypt(
      protectedKey.key,
      protectedKey.mac,
      protectedKey.iv
    );
    return this.getKeyType(decryptedBuffer);
  }
}

/**
 * Key to protect and extract a Symmetric Key.
 */
export class StretchedMasterKey extends Key<
  ProtectedSymmetricKey,
  SymmetricKey
> {
  constructor(keybuffer: Uint8Array) {
    super(keybuffer);
  }

  protected getKeyType(keybuffer: Uint8Array): SymmetricKey {
    return new SymmetricKey(keybuffer);
  }

  protected setProtectedKeyType(keybuffer: Uint8Array): ProtectedSymmetricKey {
    return new ProtectedSymmetricKey(keybuffer);
  }
}

/**
 * Key to protect and extract a Cipher Key.
 */
export class SymmetricKey extends Key<ProtectedCipherKey, CipherKey> {
  constructor(keybuffer: Uint8Array) {
    super(keybuffer);
  }

  protected getKeyType(keybuffer: Uint8Array): AESHMACKey {
    return new CipherKey(keybuffer);
  }

  protected setProtectedKeyType(keybuffer: Uint8Array): ProtectedCipherKey {
    return new ProtectedCipherKey(keybuffer);
  }
}

/**
 * Key to encrypt and decrypt a cipher data.
 */
export class CipherKey extends AESHMACKey {
  constructor(keybuffer: Uint8Array) {
    super(keybuffer);
  }
}

abstract class ProtectedKey extends BaseKey {
  private IV_START_LEN = this.keybuffer.length - 16;
  private MAC_START_LEN = this.IV_START_LEN - 32;

  key: Uint8Array;
  mac: Uint8Array;
  iv: Uint8Array;

  constructor(keybuffer: Uint8Array) {
    super(keybuffer);

    this.iv = keybuffer.slice(this.IV_START_LEN, keybuffer.byteLength);
    this.mac = keybuffer.slice(this.MAC_START_LEN, this.IV_START_LEN);
    this.key = keybuffer.slice(0, this.MAC_START_LEN);
  }
}

/**
 * Encrypted and signed symmetric key.
 */
export class ProtectedSymmetricKey extends ProtectedKey {
  constructor(keybuffer: Uint8Array) {
    super(keybuffer);
  }
}

/**
 * Encrypted and signed cipher key.
 */
export class ProtectedCipherKey extends ProtectedKey {
  constructor(keybuffer: Uint8Array) {
    super(keybuffer);
  }
}
