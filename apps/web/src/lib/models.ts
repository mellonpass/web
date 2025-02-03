import { arrayBufferToHex, hexToArrayBuffer } from "$lib/utils/bytes";

abstract class KeyMixin {
  keybuffer: Uint8Array<ArrayBuffer>;

  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    this.keybuffer = keybuffer;
  }

  toBase64() {
    return btoa(arrayBufferToHex(this.keybuffer));
  }

  static fromBase64<T extends KeyMixin>(
    this: new (encodedKey: any) => T,
    encodedKey: any
  ): T {
    return new this(hexToArrayBuffer(atob(encodedKey)));
  }
}

export abstract class Key extends KeyMixin {
  private aeskeyBuffer: Uint8Array<ArrayBuffer>;
  private mackeyBuffer: Uint8Array<ArrayBuffer>;

  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
    this.aeskeyBuffer = keybuffer.slice(0, 32);
    this.mackeyBuffer = keybuffer.slice(32, 64);
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

  protected async getAESKey(): Promise<CryptoKey> {
    return await crypto.subtle.importKey(
      "raw",
      this.aeskeyBuffer,
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"]
    );
  }

  protected async hmacSignKey(
    key: Uint8Array<ArrayBuffer>
  ): Promise<Uint8Array<ArrayBuffer>> {
    const macKey = await this.getMACKey();
    const buffer = await crypto.subtle.sign("HMAC", macKey, key);
    return new Uint8Array(buffer);
  }

  protected async hmacVerifyKey(
    signature: Uint8Array<ArrayBuffer>,
    data: Uint8Array<ArrayBuffer>
  ): Promise<boolean> {
    const macKey = await this.getMACKey();
    return await crypto.subtle.verify("HMAC", macKey, signature, data);
  }

  protected async encryptSign(
    data: Uint8Array<ArrayBuffer> | Uint8Array
  ): Promise<Uint8Array<ArrayBuffer>> {
    const iv = crypto.getRandomValues(new Uint8Array(16));

    // buffer is includes 128-bit mac.
    const encBuffer = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      await this.getAESKey(),
      data
    );

    const buffer = new Uint8Array(encBuffer);
    // sign result with another 256-bit mac.
    const mac = await this.hmacSignKey(buffer);

    // combine data into a single byte.
    return new Uint8Array([...buffer, ...mac, ...iv]);
  }

  async protectKey(key: Key): Promise<ProtectedKey> {
    const pskBuffer = await this.encryptSign(key.keybuffer);
    return this.setProtectedKeyType(pskBuffer);
  }

  protected abstract setProtectedKeyType(
    keybuffer: Uint8Array<ArrayBuffer>
  ): ProtectedKey;

  async extractKey(protectedKey: ProtectedKey): Promise<Key> {
    const result = await this.hmacVerifyKey(protectedKey.mac, protectedKey.key);
    if (result) {
      const baseKey = await this.getAESKey();
      // decrypted symmetric key.
      const buffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: protectedKey.iv },
        baseKey,
        protectedKey.key
      );
      return this.getKeyType(new Uint8Array(buffer));
    }
    throw new Error("Invalid MAC signature!");
  }

  protected abstract getKeyType(keybuffer: Uint8Array<ArrayBuffer>): Key;
}

export class StretchedMasterKey extends Key {
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }

  protected getKeyType(keybuffer: Uint8Array<ArrayBuffer>): SymmetricKey {
    return new SymmetricKey(keybuffer);
  }

  protected setProtectedKeyType(
    keybuffer: Uint8Array<ArrayBuffer>
  ): ProtectedSymmetricKey {
    return new ProtectedSymmetricKey(keybuffer);
  }
}

export class SymmetricKey extends Key {
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }

  protected getKeyType(keybuffer: Uint8Array<ArrayBuffer>): CipherKey {
    return new CipherKey(keybuffer);
  }

  protected setProtectedKeyType(
    keybuffer: Uint8Array<ArrayBuffer>
  ): ProtectedCipherKey {
    return new ProtectedCipherKey(keybuffer);
  }
}

abstract class BaseCipherKey extends Key {
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }

  protected getKeyType(keybuffer: Uint8Array<ArrayBuffer>): Key {
    throw {};
  }

  protected setProtectedKeyType(
    keybuffer: Uint8Array<ArrayBuffer>
  ): ProtectedKey {
    throw {};
  }

  protectKey(key: Key): Promise<ProtectedKey> {
    throw new Error("Cipher key should be not able to protect a key.");
  }

  extractKey(protectedKey: ProtectedKey): Promise<Key> {
    throw new Error("Cipher key should be not able to extract a key.");
  }
}

export class CipherKey extends BaseCipherKey {
  async encryptText(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const buffer = await this.encryptSign(encoder.encode(text));
    return btoa(arrayBufferToHex(buffer));
  }
}

abstract class ProtectedKey extends KeyMixin {
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

export class ProtectedSymmetricKey extends ProtectedKey {
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }
}

export class ProtectedCipherKey extends ProtectedKey {
  constructor(keybuffer: Uint8Array<ArrayBuffer>) {
    super(keybuffer);
  }
}
