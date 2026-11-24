import { arrayBufferToBase64 } from "$lib/bytes";
import {
  decryptPrivateKeyWithSymmetricKey,
  extractSymmetricKey,
  generateAsymmetricKeys,
  generateLoginhash,
  generateMasterKey,
  generateProtectedSymmetricKey,
  generateStretchedMasterKey,
} from "$lib/key-generation";
import { StretchedMasterKey, type SymmetricKey } from "$lib/models/keys";

export type CryptoProgressCallback = (step: string, percent: number) => void;

export interface ChangePasswordDerivedKeys {
  currentLoginHash: string;
  newMasterKey: Uint8Array;
  newLoginHash: string;
  newStretchedMasterKey: StretchedMasterKey;
}

/**
 * In-memory storage for the user's decrypted RSA-OAEP private key.
 * This key is never persisted to localStorage or sessionStorage.
 * It is held in-memory during unlocked vault sessions and wiped on vault lock / logout.
 */
let userRsaPrivateKey: CryptoKey | null = null;
let rsaInitPromise: Promise<CryptoKey> | null = null;

export function getUserRsaPrivateKey(): CryptoKey | null {
  return userRsaPrivateKey;
}

/**
 * Returns the decrypted RSA private key if already initialized, or awaits
 * the pending initialization promise. Returns null if vault is locked or initialization fails.
 */
export async function getOrAwaitUserRsaPrivateKey(): Promise<CryptoKey | null> {
  if (userRsaPrivateKey) return userRsaPrivateKey;
  if (rsaInitPromise) {
    try {
      return await rsaInitPromise;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Checks whether the user's RSA private key is currently loaded in memory.
 */
export function isUserRsaPrivateKeyReady(): boolean {
  return userRsaPrivateKey !== null;
}

/**
 * For testing and internal test harnesses: sets or resets the in-memory RSA private key.
 * @internal
 */
export function setUserRsaPrivateKey(key: CryptoKey | null): void {
  userRsaPrivateKey = key;
  rsaInitPromise = null;
}

export function clearUserRsaPrivateKey(): void {
  userRsaPrivateKey = null;
  rsaInitPromise = null;
}

/**
 * Decrypts the user's RSA private key using their unlocked SymmetricKey and stores it in memory.
 * Deduplicates concurrent initialization attempts.
 *
 * @param sk Unlocked SymmetricKey
 * @param rsaProtectedKey Encrypted and MAC-protected private key string
 * @returns Decrypted RSA-OAEP private CryptoKey
 */
export async function initializeUserRsaPrivateKey(
  sk: SymmetricKey,
  rsaProtectedKey: string
): Promise<CryptoKey> {
  if (userRsaPrivateKey) {
    return userRsaPrivateKey;
  }
  if (rsaInitPromise) {
    return await rsaInitPromise;
  }

  const promise = (async () => {
    try {
      const privateKey = await decryptPrivateKeyWithSymmetricKey(
        sk,
        rsaProtectedKey
      );
      userRsaPrivateKey = privateKey;
      return privateKey;
    } catch (err) {
      userRsaPrivateKey = null;
      throw err;
    } finally {
      rsaInitPromise = null;
    }
  })();

  rsaInitPromise = promise;
  return await promise;
}

function createAbortError(): Error {
  if (typeof DOMException !== "undefined") {
    return new DOMException("Operation aborted", "AbortError");
  }
  const err = new Error("Operation aborted");
  err.name = "AbortError";
  return err;
}

function isAbortError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "AbortError" || err.message === "Operation aborted")
  );
}

function runWorkerTask<T>(
  type:
    | "DERIVE_LOGIN_KEYS"
    | "DERIVE_SETUP_KEYS"
    | "DERIVE_CHANGE_PASSWORD_KEYS",
  payload: Record<string, any>,
  onProgress?: CryptoProgressCallback,
  signal?: AbortSignal
): Promise<T> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(createAbortError());
      return;
    }

    let worker: Worker | null = null;
    let settled = false;

    const cleanup = () => {
      signal?.removeEventListener("abort", onAbort);
    };

    const onAbort = () => {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        worker?.terminate();
      } catch {}
      reject(createAbortError());
    };

    try {
      worker = new Worker(
        new URL("./workers/crypto.worker.ts", import.meta.url),
        { type: "module" }
      );
      const id = crypto.randomUUID();
      signal?.addEventListener("abort", onAbort, { once: true });

      worker.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (data.id !== id || settled) return;

        if (data.type === "PROGRESS") {
          onProgress?.(data.step, data.percent);
        } else if (data.type === "RESULT") {
          settled = true;
          cleanup();
          worker?.terminate();
          resolve(data.result as T);
        } else if (data.type === "ERROR") {
          settled = true;
          cleanup();
          worker?.terminate();
          reject(new Error(data.error));
        }
      };

      worker.onerror = (err) => {
        if (settled) return;
        settled = true;
        cleanup();
        worker?.terminate();
        reject(err);
      };

      worker.postMessage({ id, type, payload });
    } catch (err) {
      if (!settled) {
        settled = true;
        cleanup();
        try {
          worker?.terminate();
        } catch {}
        reject(err);
      }
    }
  });
}

export async function deriveLoginKeysAsync(
  email: string,
  masterPassword: string,
  onProgress?: CryptoProgressCallback
): Promise<{ mkBase64: string; loginHash: string }> {
  try {
    return await runWorkerTask<{ mkBase64: string; loginHash: string }>(
      "DERIVE_LOGIN_KEYS",
      { email, masterPassword },
      onProgress
    );
  } catch {
    // Fallback to main thread if Worker fails to initialize
    onProgress?.("Deriving master key (720,000 PBKDF2 iterations)...", 35);
    const mk = await generateMasterKey(email, masterPassword);
    onProgress?.("Computing zero-knowledge authentication hash...", 80);
    const loginHash = await generateLoginhash(mk, masterPassword);
    return {
      mkBase64: arrayBufferToBase64(mk),
      loginHash,
    };
  }
}

export async function deriveSetupKeysAsync(
  email: string,
  masterPassword: string,
  onProgress?: CryptoProgressCallback
): Promise<{
  loginHash: string;
  epsk: string;
  rsaProtectedKey: string;
  rsaEncodedPublicKey: string;
}> {
  try {
    return await runWorkerTask(
      "DERIVE_SETUP_KEYS",
      { email, masterPassword },
      onProgress
    );
  } catch {
    onProgress?.("Deriving master key (720,000 PBKDF2 iterations)...", 20);
    const mk = await generateMasterKey(email, masterPassword);
    onProgress?.("Computing zero-knowledge login hash...", 45);
    const loginHash = await generateLoginhash(mk, masterPassword);
    onProgress?.("Stretching master key & generating vault key...", 65);
    const smk = await generateStretchedMasterKey(mk);
    const psk = await generateProtectedSymmetricKey(smk);
    const sk = await extractSymmetricKey(arrayBufferToBase64(mk), psk);
    onProgress?.("Generating 4096-bit RSA-OAEP asymmetric keypair...", 85);
    const [rsaPrivateKey, rsaPublicKey] = await generateAsymmetricKeys();
    onProgress?.("Encrypting private key...", 95);
    const epsk = psk.toBase64();
    const encoder = new TextEncoder();
    const rsaProtectedKey = await sk.encrypt(
      encoder.encode(JSON.stringify(rsaPrivateKey))
    );
    const rsaEncodedPublicKey = btoa(
      arrayBufferToBase64(encoder.encode(JSON.stringify(rsaPublicKey)))
    );
    return {
      loginHash,
      epsk,
      rsaProtectedKey,
      rsaEncodedPublicKey,
    };
  }
}

export async function deriveChangePasswordKeysAsync(
  email: string,
  currentMasterPassword: string,
  newMasterPassword: string,
  onProgress?: CryptoProgressCallback,
  signal?: AbortSignal
): Promise<ChangePasswordDerivedKeys> {
  if (signal?.aborted) {
    throw createAbortError();
  }

  try {
    const workerResult = await runWorkerTask<{
      currentLoginHash: string;
      newMasterKey: Uint8Array;
      newLoginHash: string;
      newStretchedMasterKey: Uint8Array;
    }>(
      "DERIVE_CHANGE_PASSWORD_KEYS",
      { email, currentMasterPassword, newMasterPassword },
      onProgress,
      signal
    );

    const newMasterKey =
      workerResult.newMasterKey instanceof Uint8Array
        ? workerResult.newMasterKey
        : new Uint8Array(workerResult.newMasterKey);
    const smkBytes =
      workerResult.newStretchedMasterKey instanceof Uint8Array
        ? workerResult.newStretchedMasterKey
        : new Uint8Array(workerResult.newStretchedMasterKey);
    const newStretchedMasterKey = new StretchedMasterKey(smkBytes);

    if (signal?.aborted) {
      newMasterKey.fill(0);
      newStretchedMasterKey.zero();
      throw createAbortError();
    }

    return {
      currentLoginHash: workerResult.currentLoginHash,
      newMasterKey,
      newLoginHash: workerResult.newLoginHash,
      newStretchedMasterKey,
    };
  } catch (err) {
    if (signal?.aborted || isAbortError(err)) {
      throw isAbortError(err) ? err : createAbortError();
    }

    // Fallback to main thread if Worker fails to initialize
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

      onProgress?.(
        "Deriving new master key (720,000 PBKDF2 iterations)...",
        60
      );
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
}
