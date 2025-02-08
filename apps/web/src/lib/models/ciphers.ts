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

export class CipherLogin extends Cipher {
  data: CipherData;

  constructor({
    type = CipherType.LOGIN,
    key,
    name,
    data,
  }: {
    type?: CipherType;
    key: string;
    name: string;
    data: CipherLoginData;
  }) {
    super({ type: type, key: key, name: name });
    this.data = data;
  }
}

export class CipherSecureNote extends Cipher {
  data: CipherData;

  constructor({
    type = CipherType.SECURE_NOTE,
    key,
    name,
    data,
  }: {
    type?: CipherType;
    key: string;
    name: string;
    data: CipherSecureNoteData;
  }) {
    super({ type: type, key: key, name: name });
    this.data = data;
  }
}
