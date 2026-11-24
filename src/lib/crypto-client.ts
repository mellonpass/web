import { arrayBufferToBase64 } from "$lib/bytes";
import {
  createAbortError,
  deriveChangePasswordKeys,
  isAbortError,
  type ChangePasswordDerivedKeys,
  type CryptoProgressCallback,
} from "$lib/change-password-derivation";
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

export type { ChangePasswordDerivedKeys, CryptoProgressCallback };

class WorkerExecutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkerExecutionError";
  }
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

    const settle = (cb: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      if (worker) {
        worker.onmessage = null;
        worker.onerror = null;
        try {
          worker.terminate();
        } catch {}
      }
      cb();
    };

    const onAbort = () => {
      settle(() => reject(createAbortError()));
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
          settle(() => resolve(data.result as T));
        } else if (data.type === "ERROR") {
          settle(() => reject(new WorkerExecutionError(data.error)));
        }
      };

      worker.onerror = (err) => {
        settle(() => reject(err));
      };

      worker.postMessage({ id, type, payload });
    } catch (err) {
      settle(() => reject(err));
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
    if (err instanceof WorkerExecutionError) {
      throw err;
    }

    // Fallback to main thread if Worker fails to initialize
    return await deriveChangePasswordKeys(
      email,
      currentMasterPassword,
      newMasterPassword,
      onProgress,
      signal
    );
  }
}
