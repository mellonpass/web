export interface CipherCardData {
  cardholderName: string;
  number: string;
  brand: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
}

export interface CipherLoginData {
  username: string;
  password: string;
}

export interface CipherSecuresNoteData {
  type: string;
}

export type CipherData =
  | CipherLoginData
  | CipherSecuresNoteData
  | CipherCardData;

export enum CipherType {
  CARD = "CARD",
  LOGIN = "LOGIN",
  SECURE_NOTE = "SECURE_NOTE",
}

export enum CipherStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
}

export enum VaultStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
}

// Cipher data that are encrypted and decrypted from vault item data.
export interface Cipher {
  id?: string;
  isFavorite: string;
  type: CipherType;
  key: string;
  name: string;
  notes: string;
  status: string;
  data?: CipherData | null;
  created?: Date | null;
  updated?: Date | null;
}

export interface VaultData {
  id: string;
  isFavorite: boolean;
  type: CipherType;
  name: string;
  notes: string;
  status: VaultStatus;
  content?: any;
}

// This is the items that are shown at the list of vault items
export interface VaultItem extends VaultData {
  content: string;
}

// This is the vault's data on view/edit form
// when a user selects a vault item on the list.
export interface VaultItemDetail<T extends CipherData> extends VaultData {
  data: T;
}

export enum CipherCategory {
  ARCHIVES = "ARCHIVES",
  All = "ALL",
  FAVORITES = "FAVORITES",
  CARDS = "CARDS",
  LOGINS = "LOGINS",
  SECURE_NOTES = "SECURE_NOTES",
  RECENTLY_DELETED = "DELETED",
}

export interface FormItemDetails {
  name: string;
  notes: string | null;
}

export type FormCallBack = (args: any) => void;
