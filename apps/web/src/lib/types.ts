interface CipherLoginData {
  username: string;
  password: string;
}

interface CipherSecureNoteData {
  note: string;
}

type CipherData = CipherLoginData | CipherSecureNoteData;

export enum CipherType {
  LOGIN = "LOGIN",
  SECURE_NOTE = "SECURE_NOTE",
}

export interface Cipher {
  isFavorite: boolean;
  type: CipherType;
  key: string;
  name: string;
  data: CipherData;
}

export interface CipherItem extends Cipher {
  id: string;
  selected: boolean;
}
