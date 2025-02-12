export interface CipherLoginData {
  username: string;
  password: string;
}

export interface CipherSecureNoteData {
  note: string;
}

export type CipherData = CipherLoginData | CipherSecureNoteData;

export enum CipherType {
  LOGIN = "LOGIN",
  SECURE_NOTE = "SECURE_NOTE",
}

export interface Cipher {
  id?: string;
  isFavorite: boolean;
  type: CipherType;
  key: string;
  name: string;
  data: CipherData;
}

export interface VaultItem {
  id: string;
  type: CipherType;
  selected: boolean;
  name: string;
  content: string;
}
