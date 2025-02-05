import { CipherKey, ProtectedCipherKey, SymmetricKey } from "$lib/models/keys";

type CipherLoginData = {
  username: string;
  password: string;
};

type CipherSecureNoteData = {
  note: string;
};

type CipherData = CipherLoginData | CipherSecureNoteData;

export enum CipherType {
  LOGIN = "LOGIN",
  SECURE_NOTE = "SECURE_NOTE",
}

interface CipherDataArgs {
  type: CipherType;
  key: string;
  name: string;
}

export abstract class Cipher {
  type: CipherType;
  key: string;
  name: string;

  abstract data: CipherData;

  constructor({ type, key, name }: CipherDataArgs) {
    this.type = type;
    this.key = key;
    this.name = name;
  }

  toDict() {
    return {
      type: this.type,
      key: this.key,
      name: this.name,
      data: this.data,
    };
  }
}

interface CipherLoginArgs extends CipherDataArgs {
  data: CipherLoginData;
}

export class CipherLogin extends Cipher {
  data: CipherData;

  constructor({ key, name, data }: CipherLoginArgs) {
    super({ type: CipherType.LOGIN, key: key, name: name });
    this.data = data;
  }
}
