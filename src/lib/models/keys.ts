import { arrayBufferToHex, hexToArrayBuffer } from "$lib/bytes";
import { ProtectedData } from "./data";

const BIT_SIZE = 8;

/**
 * Base key that imports AES and MAC keys from the keybuffer.
 */
abstract class BaseKey {
  protected aeskeyBuffer: Uint8Array<ArrayBuffer>;
  protected mackeyBuffer: Uint8Array<ArrayBuffer>;

  keybuffer: Uint8Array<ArrayBuffer>;

  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
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

  toBase64() {
    return btoa(arrayBufferToHex(this.keybuffer));
  }

  static fromBase64<T extends BaseKey>(
    this: new (encodedKey: any) => T,
    encodedKey: any
  ): T {
    return new this(hexToArrayBuffer(atob(encodedKey)));
  }
}

/**
 * A key that can do AES encrypt-decrypt and HMAC sign-verify.
 */
export abstract class AESHMACKey extends BaseKey {
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }

  protected async hmacSign(
    data: Uint8Array<ArrayBuffer>
  ): Promise<Uint8Array<ArrayBuffer>> {
    const macKey = await this.getMACKey();
    const buffer = await crypto.subtle.sign("HMAC", macKey, data);
    return new Uint8Array(buffer);
  }

  protected async hmacVerify(
    signature: Uint8Array<ArrayBuffer>,
    data: Uint8Array<ArrayBuffer>
  ): Promise<boolean> {
    const macKey = await this.getMACKey();
    return await crypto.subtle.verify("HMAC", macKey, signature, data);
  }

  protected async encryptSign(
    data: Uint8Array
  ): Promise<Uint8Array<ArrayBuffer>> {
    const iv = crypto.getRandomValues(new Uint8Array(16));
    const counterLength = iv.byteLength * BIT_SIZE;

    const encBuffer = await crypto.subtle.encrypt(
      { name: "AES-CTR", counter: iv, length: counterLength },
      await this.getAESKey(),
      data
    );

    const buffer = new Uint8Array(encBuffer);
    const mac = await this.hmacSign(buffer);

    // combine data into a single byte.
    return new Uint8Array([...buffer, ...mac, ...iv]);
  }

  protected async verifyDecrypt(
    data: Uint8Array<ArrayBuffer>,
    mac: Uint8Array<ArrayBuffer>,
    iv: Uint8Array<ArrayBuffer>
  ): Promise<Uint8Array<ArrayBuffer>> {
    const valid = await this.hmacVerify(mac, data);
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
    const databuffer = hexToArrayBuffer(data);
    const pData = new ProtectedData(databuffer);
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
 * A key that can protect Key and extract from a ProtectedKey.
 */
export abstract class Key extends AESHMACKey {
  async protectKey(key: Key | AESHMACKey): Promise<ProtectedKey> {
    const pskBuffer = await this.encryptSign(key.keybuffer);
    return this.setProtectedKeyType(pskBuffer);
  }

  protected abstract setProtectedKeyType(
    keybuffer: Uint8Array<ArrayBuffer>
  ): ProtectedKey;

  async extractKey(protectedKey: ProtectedKey): Promise<Key | AESHMACKey> {
    const decryptedBuffer = await this.verifyDecrypt(
      protectedKey.key,
      protectedKey.mac,
      protectedKey.iv
    );
    return this.getKeyType(decryptedBuffer);
  }

  protected abstract getKeyType(
    keybuffer: Uint8Array<ArrayBuffer>
  ): Key | AESHMACKey;
}

/**
 * Key to protect and extract a Symmetric Key.
 */
export class StretchedMasterKey extends Key {
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }

  protected getKeyType(keybuffer: Uint8Array<ArrayBuffer>): Key {
    return new SymmetricKey(keybuffer);
  }

  protected setProtectedKeyType(
    keybuffer: Uint8Array<ArrayBuffer>
  ): ProtectedSymmetricKey {
    return new ProtectedSymmetricKey(keybuffer);
  }
}

/**
 * Key to protect and extract a Cipher Key.
 */
export class SymmetricKey extends Key {
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }

  protected getKeyType(keybuffer: Uint8Array<ArrayBuffer>): AESHMACKey {
    return new CipherKey(keybuffer);
  }

  protected setProtectedKeyType(
    keybuffer: Uint8Array<ArrayBuffer>
  ): ProtectedCipherKey {
    return new ProtectedCipherKey(keybuffer);
  }
}

/**
 * Key to encrypt and decrypt a cipher data.
 */
export class CipherKey extends AESHMACKey {
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }
}

abstract class ProtectedKey extends BaseKey {
  private IV_START_LEN = this.keybuffer.length - 16;
  private MAC_START_LEN = this.IV_START_LEN - 32;

  key: Uint8Array<ArrayBuffer>;
  mac: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;

  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
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
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }
}

/**
 * Encrypted and signed cipher key.
 */
export class ProtectedCipherKey extends ProtectedKey {
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }
}
