import {
  CipherKey,
  ProtectedCipherKey,
  type SymmetricKey,
} from "$lib/models/keys";

type CipherLoginData = {
  username: Uint8Array;
  password: Uint8Array;
};

type CipherSecureNoteData = {
  note: Uint8Array;
};

type CipherData = CipherLoginData | CipherSecureNoteData;

export enum CipherType {
  LOGIN = "LOGIN",
  SECURE_NOTE = "SECURE_NOTE",
}

export abstract class Cipher {
  type: CipherType;
  key: CipherKey;
  name: Uint8Array;
  data: CipherData;

  constructor(
    type: CipherType,
    key: CipherKey,
    name: Uint8Array,
    data: CipherData
  ) {
    this.type = type;
    this.key = key;
    this.name = name;
    this.data = data;
  }

  abstract encryptData(sk: SymmetricKey): Promise<{ [key: string]: any }>;

  //   async extractKey(): Promise<CipherKey> {
  //     const psk = new ProtectedCipherKey(hexToArrayBuffer(atob(this.key)));
  //     return (await this.sk!.extractKey(psk)) as CipherKey;
  //   }
}

export class CipherLogin extends Cipher {
  constructor(key: CipherKey, name: Uint8Array, data: CipherLoginData) {
    super(CipherType.LOGIN, key, name, <CipherLoginData>data);
  }

  async encryptData(sk: SymmetricKey): Promise<{ [key: string]: any }> {
    return {
      type: this.type,
      key: (<ProtectedCipherKey>await sk.protectKey(this.key)).toBase64(),
      name: await this.key.encrypt(this.name),
      data: {
        username: await this.key.encrypt((<CipherLoginData>this.data).username),
        password: await this.key.encrypt((<CipherLoginData>this.data).password),
      },
    };
  }
}
