import {
  extractSymmetricKey,
  generateAsymmetricKeys,
  generateLoginhash,
  generateMasterKey,
  generateProtectedSymmetricKey,
  generateStretchedMasterKey,
} from "../key-generation";
import type { StretchedMasterKey } from "../models/keys";

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

self.onmessage = async (event: MessageEvent) => {
  const { id, type, payload } = event.data;

  const sendProgress = (step: string, percent: number) => {
    self.postMessage({ id, type: "PROGRESS", step, percent });
  };

  try {
    if (type === "DERIVE_LOGIN_KEYS") {
      const { email, masterPassword } = payload;
      sendProgress("Deriving master key (720,000 PBKDF2 iterations)...", 35);
      const mk = await generateMasterKey(email, masterPassword);

      sendProgress("Computing zero-knowledge authentication hash...", 80);
      const loginHash = await generateLoginhash(mk, masterPassword);

      self.postMessage({
        id,
        type: "RESULT",
        result: {
          mkBase64: uint8ToBase64(mk),
          loginHash,
        },
      });
    } else if (type === "DERIVE_SETUP_KEYS") {
      const { email, masterPassword } = payload;
      sendProgress("Deriving master key (720,000 PBKDF2 iterations)...", 20);
      const mk = await generateMasterKey(email, masterPassword);

      sendProgress("Computing zero-knowledge login hash...", 45);
      const loginHash = await generateLoginhash(mk, masterPassword);

      sendProgress(
        "Stretching master key (HKDF-SHA512) & generating vault key...",
        65
      );
      const smk = await generateStretchedMasterKey(mk);
      const psk = await generateProtectedSymmetricKey(smk);
      const mkBase64 = uint8ToBase64(mk);
      const sk = await extractSymmetricKey(mkBase64, psk);

      sendProgress("Generating 4096-bit RSA-OAEP asymmetric keypair...", 85);
      const [rsaPrivateKey, rsaPublicKey] = await generateAsymmetricKeys();

      sendProgress("Encrypting private key with symmetric vault key...", 95);
      const epsk = psk.toBase64();
      const encoder = new TextEncoder();
      const rsaProtectedKey = await sk.encrypt(
        encoder.encode(JSON.stringify(rsaPrivateKey))
      );
      const pubBytes = new Uint8Array(
        encoder.encode(JSON.stringify(rsaPublicKey))
      );
      const rsaEncodedPublicKey = btoa(uint8ToBase64(pubBytes));

      self.postMessage({
        id,
        type: "RESULT",
        result: {
          loginHash,
          epsk,
          rsaProtectedKey,
          rsaEncodedPublicKey,
        },
      });
    } else if (type === "DERIVE_CHANGE_PASSWORD_KEYS") {
      const { email, currentMasterPassword, newMasterPassword } = payload;
      let currentMk: Uint8Array | null = null;
      let newMk: Uint8Array | null = null;
      let newSmk: StretchedMasterKey | null = null;

      try {
        sendProgress(
          "Deriving current master key (720,000 PBKDF2 iterations)...",
          15
        );
        currentMk = await generateMasterKey(email, currentMasterPassword);

        sendProgress("Computing current login verification hash...", 35);
        const currentLoginHash = await generateLoginhash(
          currentMk,
          currentMasterPassword
        );
        currentMk.fill(0);
        currentMk = null;

        sendProgress(
          "Deriving new master key (720,000 PBKDF2 iterations)...",
          60
        );
        newMk = await generateMasterKey(email, newMasterPassword);

        sendProgress("Computing new zero-knowledge login hash...", 80);
        const newLoginHash = await generateLoginhash(newMk, newMasterPassword);

        sendProgress("Stretching new master key (HKDF-SHA512)...", 92);
        newSmk = await generateStretchedMasterKey(newMk);

        const newMasterKeyTransfer = new Uint8Array(newMk);
        const newStretchedMasterKeyTransfer = new Uint8Array(newSmk.keybuffer);

        self.postMessage(
          {
            id,
            type: "RESULT",
            result: {
              currentLoginHash,
              newMasterKey: newMasterKeyTransfer,
              newLoginHash,
              newStretchedMasterKey: newStretchedMasterKeyTransfer,
            },
          },
          {
            transfer: [
              newMasterKeyTransfer.buffer,
              newStretchedMasterKeyTransfer.buffer,
            ],
          }
        );
      } finally {
        currentMk?.fill(0);
        newMk?.fill(0);
        newSmk?.zero();
      }
    }
  } catch (err: any) {
    self.postMessage({
      id,
      type: "ERROR",
      error: err?.message || "Cryptographic operation failed",
    });
  }
};
