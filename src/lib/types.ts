export interface CipherCardData {
  cardholderName: string;
  number: string;
  brand: string;
  expMonth: string;
  expYear: string;
  securityCode: string;
}

export interface CipherDatabaseData {
  engine: string;
  connectionType: string;
  url?: string;
  host?: string;
  port?: string;
  database?: string;
  username?: string;
  password?: string;
}

export interface CipherLoginData {
  username: string;
  password: string;
  authenticatorKey: string;
  url?: string;
}

export interface CipherSecuresNoteData {
  type: string;
}

export type CipherData =
  | CipherLoginData
  | CipherSecuresNoteData
  | CipherCardData
  | CipherDatabaseData;

export enum CipherType {
  CARD = "CARD",
  LOGIN = "LOGIN",
  SECURE_NOTE = "SECURE_NOTE",
  DATABASE = "DATABASE",
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
  deleteOn?: string | Date | null;
  created?: Date | string | null;
  updated?: Date | string | null;
  data?: CipherData | null;
}

export interface VaultData {
  id: string;
  isFavorite: boolean;
  type: CipherType;
  name: string;
  notes: string;
  status: VaultStatus;
  deleteOn?: Date | null;
  created?: Date | null;
  updated?: Date | null;
  content?: any;
}

// Items shown in the vault item list pane
export interface VaultItem extends VaultData {
  content: string;
}

// Full decrypted detail shown in the view/edit pane
export interface VaultItemDetail<T extends CipherData> extends VaultData {
  data: T;
  created: Date;
  updated: Date;
}

export enum CipherCategory {
  ARCHIVES = "ARCHIVES",
  All = "ALL",
  FAVORITES = "FAVORITES",
  CARDS = "CARDS",
  LOGINS = "LOGINS",
  SECURE_NOTES = "SECURE_NOTES",
  DATABASES = "DATABASES",
  RECENTLY_DELETED = "DELETED",
  WATCHTOWER = "WATCHTOWER",
}

export interface FormItemDetails {
  name: string;
  notes: string | null;
}

export interface FormItemHistory {
  lastEdited: Date;
  created: Date;
}

export type FormCallBack = (args: any) => void;
