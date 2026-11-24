import {
  generateLoginhash,
  generateMasterKey,
  generateStretchedMasterKey,
} from "./key-generation";
import type { StretchedMasterKey } from "./models/keys";

export type CryptoProgressCallback = (step: string, percent: number) => void;

export interface ChangePasswordDerivedKeys {
  currentLoginHash: string;
  newMasterKey: Uint8Array;
  newLoginHash: string;
  newStretchedMasterKey: StretchedMasterKey;
}

export function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Operation aborted", "AbortError");
  }
  const err = new Error("Operation aborted");
  err.name = "AbortError";
  return err;
}

export function isAbortError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) {
    return false;
  }
  const maybeErr = err as { name?: unknown; message?: unknown };
  return (
    maybeErr.name === "AbortError" || maybeErr.message === "Operation aborted"
  );
}

/**
 * Derives current login verification hash and new Master/Login/Stretched keys
 * for Master Password rotation, reporting progress and zeroing intermediate buffers
 * on completion, error, or abort.
 */
export async function deriveChangePasswordKeys(
  email: string,
  currentMasterPassword: string,
  newMasterPassword: string,
  onProgress?: CryptoProgressCallback,
  signal?: AbortSignal
): Promise<ChangePasswordDerivedKeys> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  let currentMk: Uint8Array | null = null;
  let newMk: Uint8Array | null = null;
  let newSmk: StretchedMasterKey | null = null;
  let succeeded = false;

  try {
    onProgress?.(
      "Deriving current master key (720,000 PBKDF2 iterations)...",
      15
    );
    currentMk = await generateMasterKey(email, currentMasterPassword);
    if (signal?.aborted) throw createAbortError();

    onProgress?.("Computing current login verification hash...", 35);
    const currentLoginHash = await generateLoginhash(
      currentMk,
      currentMasterPassword
    );
    currentMk.fill(0);
    currentMk = null;
    if (signal?.aborted) throw createAbortError();

    onProgress?.("Deriving new master key (720,000 PBKDF2 iterations)...", 60);
    newMk = await generateMasterKey(email, newMasterPassword);
    if (signal?.aborted) throw createAbortError();

    onProgress?.("Computing new zero-knowledge login hash...", 80);
    const newLoginHash = await generateLoginhash(newMk, newMasterPassword);
    if (signal?.aborted) throw createAbortError();

    onProgress?.("Stretching new master key (HKDF-SHA512)...", 92);
    newSmk = await generateStretchedMasterKey(newMk);
    if (signal?.aborted) throw createAbortError();

    succeeded = true;
    return {
      currentLoginHash,
      newMasterKey: newMk,
      newLoginHash,
      newStretchedMasterKey: newSmk,
    };
  } finally {
    currentMk?.fill(0);
    if (!succeeded) {
      newMk?.fill(0);
      newSmk?.zero();
    }
  }
}
