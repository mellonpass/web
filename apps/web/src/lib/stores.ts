import { writable, type Writable } from "svelte/store";
import type { VaultItem } from "./types";

export const newVaultItemSignal: Writable<VaultItem | null> = writable(null);
