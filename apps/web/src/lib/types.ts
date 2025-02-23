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

enum CipherStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
}

export interface Cipher {
  id?: string;
  isFavorite: boolean;
  type: CipherType;
  key: string;
  name: string;
  data: CipherData;
  status?: CipherStatus | null;
  created?: Date | null;
  updated?: Date | null;
}

export interface VaultData {
  id: string;
  type: CipherType;
  name: string;
  content?: any;
}

export interface VaultItem extends VaultData {
  content: string;
}

export enum CipherCategory {
  ARCHIVES = "ARCHIVES",
  All = "ALL",
  FAVORITES = "FAVORITES",
  LOGINS = "LOGINS",
  SECURE_NOTES = "SECURE_NOTES",
  RECENTLY_DELETED = "DELETED",
}
