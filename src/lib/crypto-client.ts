import { arrayBufferToBase64 } from "$lib/bytes";
import {
  extractSymmetricKey,
  generateAsymmetricKeys,
  generateLoginhash,
  generateMasterKey,
  generateProtectedSymmetricKey,
  generateStretchedMasterKey,
} from "$lib/key-generation";

export type CryptoProgressCallback = (step: string, percent: number) => void;

function runWorkerTask<T>(
  type: "DERIVE_LOGIN_KEYS" | "DERIVE_SETUP_KEYS",
  payload: Record<string, any>,
  onProgress?: CryptoProgressCallback
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const worker = new Worker(
        new URL("./workers/crypto.worker.ts", import.meta.url),
        { type: "module" }
      );
      const id = crypto.randomUUID();

      worker.onmessage = (event: MessageEvent) => {
        const data = event.data;
        if (data.id !== id) return;

        if (data.type === "PROGRESS") {
          onProgress?.(data.step, data.percent);
        } else if (data.type === "RESULT") {
          worker.terminate();
          resolve(data.result as T);
        } else if (data.type === "ERROR") {
          worker.terminate();
          reject(new Error(data.error));
        }
      };

      worker.onerror = (err) => {
        worker.terminate();
        reject(err);
      };

      worker.postMessage({ id, type, payload });
    } catch (err) {
      reject(err);
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
