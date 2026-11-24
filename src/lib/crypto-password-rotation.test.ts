import { afterEach, describe, expect, it, vi } from "vitest";
import { arrayBufferToBase64 } from "$lib/bytes";
import { isAbortError } from "$lib/change-password-derivation";
import * as cryptoClient from "$lib/crypto-client";
import {
  decryptOrgKeyWithPrivateKey,
  decryptPrivateKeyWithSymmetricKey,
  encryptOrgKeyWithPublicKey,
  encryptRSAPrivateKey,
  extractSymmetricKey,
  generateCipherKey,
  generateLoginhash,
  generateMasterKey,
  generateOrganizationSymmetricKey,
  generateProtectedSymmetricKey,
  generateRSAOAEPKeyPair,
  generateStretchedMasterKey,
  rewrapSymmetricKey,
} from "$lib/key-generation";
import * as keyGeneration from "$lib/key-generation";
import {
  ProtectedSymmetricKey,
  StretchedMasterKey,
  SymmetricKey,
} from "$lib/models/keys";
import {
  decryptCipherForVaultContent,
  encryptCipher,
} from "$lib/symmetric-encryption";
import {
  CipherType,
  VaultStatus,
  type CipherCardData,
  type CipherDatabaseData,
  type CipherLoginData,
  type CipherSecuresNoteData,
} from "$lib/types";

describe("Crypto Password Rotation Keys & Worker Derivation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("re-wraps SK so old Master Password fails while SK decrypts existing personal/org items and RSA private key", async () => {
    const email = "alice@mellonpass.test";
    const oldPassword = "OldMasterPassword!2025#";
    const newPassword = "NewRotatedMasterPassword!2026$";

    // Initial account setup under oldPassword
    const oldMk = await generateMasterKey(email, oldPassword);
    const oldMkBase64 = arrayBufferToBase64(oldMk);
    const oldSmk = await generateStretchedMasterKey(oldMk);
    const oldPsk = await generateProtectedSymmetricKey(oldSmk);
    const oldEpsk = oldPsk.toBase64();
    const originalSk = await extractSymmetricKey(oldMkBase64, oldEpsk);

    // Personal RSA keypair encrypted under SK
    const [privateJwk, publicJwk] = await generateRSAOAEPKeyPair();
    const rsaProtectedKey = await encryptRSAPrivateKey(originalSk, privateJwk);

    // Organization OSK encrypted with RSA public key + org cipher
    const osk = generateOrganizationSymmetricKey();
    const encryptedOsk = await encryptOrgKeyWithPublicKey(publicJwk, osk);
    const orgCipher = await encryptCipher({
      sk: osk,
      ck: generateCipherKey(),
      name: "Shared Production DB",
      notes: "Cluster credentials",
      type: CipherType.DATABASE,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
      data: {
        engine: "PostgreSQL",
        connectionType: "URL",
        url: "postgresql://admin:SecretOrgPass@db.internal:5432/app",
      },
    });

    // Personal vault items encrypted under SK -> CK
    const personalLogin = await encryptCipher({
      sk: originalSk,
      ck: generateCipherKey(),
      name: "Personal GitHub",
      notes: "Backup recovery codes",
      type: CipherType.LOGIN,
      status: VaultStatus.ACTIVE,
      isFavorite: true,
      data: {
        username: "alice",
        password: "PersonalSecret!99",
        authenticatorKey: "JBSWY3DPEHPK3PXP",
        url: "https://github.com",
      },
    });
    const personalCard = await encryptCipher({
      sk: originalSk,
      ck: generateCipherKey(),
      name: "Personal Visa",
      notes: "Primary card",
      type: CipherType.CARD,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
      data: {
        cardholderName: "Alice",
        number: "4111 1111 1111 4242",
        brand: "Visa",
        expMonth: "10",
        expYear: "2029",
        securityCode: "777",
      },
    });
    const personalNote = await encryptCipher({
      sk: originalSk,
      ck: generateCipherKey(),
      name: "Private Recovery Note",
      notes: "# Recovery\nKeep safe",
      type: CipherType.SECURE_NOTE,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
    });

    // Rotate password using deriveChangePasswordKeysAsync + rewrapSymmetricKey
    const progressEvents: Array<{ step: string; percent: number }> = [];
    const derived = await cryptoClient.deriveChangePasswordKeysAsync(
      email,
      oldPassword,
      newPassword,
      (step, percent) => progressEvents.push({ step, percent })
    );

    expect(progressEvents.length).toBeGreaterThanOrEqual(4);
    expect(derived.currentLoginHash).toBe(
      await generateLoginhash(oldMk, oldPassword)
    );
    expect(derived.newLoginHash).toBe(
      await generateLoginhash(derived.newMasterKey, newPassword)
    );

    const newPsk = await rewrapSymmetricKey(
      originalSk,
      derived.newStretchedMasterKey
    );
    expect(newPsk).toBeInstanceOf(ProtectedSymmetricKey);
    expect(newPsk.keybuffer.byteLength).toBe(112);
    expect(newPsk.key.byteLength).toBe(64);
    expect(newPsk.mac.byteLength).toBe(32);
    expect(newPsk.iv.byteLength).toBe(16);

    const newEpsk = newPsk.toBase64();
    expect(newEpsk).not.toBe(oldEpsk);

    // Old Master Password can NO LONGER unwrap the new PSK
    await expect(extractSymmetricKey(oldMkBase64, newEpsk)).rejects.toThrow(
      "Invalid MAC signature!"
    );
    await expect(oldSmk.extractKey(newPsk)).rejects.toThrow(
      "Invalid MAC signature!"
    );

    // Tampered newPsk fails MAC verification before decryption
    const tamperedBytes = new Uint8Array(newPsk.keybuffer);
    tamperedBytes[0] ^= 0xff;
    await expect(
      derived.newStretchedMasterKey.extractKey(
        new ProtectedSymmetricKey(tamperedBytes)
      )
    ).rejects.toThrow("Invalid MAC signature!");

    // New Master Password unwraps exact same SK
    const newMkBase64 = arrayBufferToBase64(derived.newMasterKey);
    const unwrappedSk = await extractSymmetricKey(newMkBase64, newEpsk);
    expect(unwrappedSk.keybuffer).toEqual(originalSk.keybuffer);

    // Existing personal ciphers decrypt seamlessly without re-encryption
    const decryptedLogin = await decryptCipherForVaultContent<CipherLoginData>(
      unwrappedSk,
      personalLogin
    );
    expect(decryptedLogin.data.password).toBe("PersonalSecret!99");

    const decryptedCard = await decryptCipherForVaultContent<CipherCardData>(
      unwrappedSk,
      personalCard
    );
    expect(decryptedCard.data.securityCode).toBe("777");

    const decryptedNote =
      await decryptCipherForVaultContent<CipherSecuresNoteData>(
        unwrappedSk,
        personalNote
      );
    expect(decryptedNote.notes).toBe("# Recovery\nKeep safe");

    // Existing RSA private key & Organization OSK + org cipher continue decrypting seamlessly
    const decryptedPrivateKey = await decryptPrivateKeyWithSymmetricKey(
      unwrappedSk,
      rsaProtectedKey
    );
    const unwrappedOsk = await decryptOrgKeyWithPrivateKey(
      decryptedPrivateKey,
      encryptedOsk
    );
    expect(unwrappedOsk.keybuffer).toEqual(osk.keybuffer);

    const decryptedOrgDb =
      await decryptCipherForVaultContent<CipherDatabaseData>(
        unwrappedOsk,
        orgCipher
      );
    expect(decryptedOrgDb.data.url).toBe(
      "postgresql://admin:SecretOrgPass@db.internal:5432/app"
    );

    // Cleanup test buffers
    oldMk.fill(0);
    oldSmk.zero();
    originalSk.zero();
    unwrappedSk.zero();
    osk.zero();
    unwrappedOsk.zero();
    derived.newMasterKey.fill(0);
    derived.newStretchedMasterKey.zero();
  }, 30_000);

  it("deriveChangePasswordKeysAsync handles Worker progress/result, abort without main-thread fallback, and error buffer zeroing", async () => {
    const email = "worker@mellonpass.test";
    const currentPw = "CurrentWorkerPass!2025";
    const newPw = "NewWorkerPass!2026";

    const terminatedCalls: number[] = [];
    class MockWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      terminate = vi.fn(() => {
        terminatedCalls.push(1);
      });
      postMessage = vi.fn((msg: any) => {
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              id: msg.id,
              type: "PROGRESS",
              step: "Deriving in worker...",
              percent: 50,
            },
          } as MessageEvent);
          this.onmessage?.({
            data: {
              id: msg.id,
              type: "RESULT",
              result: {
                currentLoginHash: "worker-curr-lh",
                newMasterKey: new Uint8Array(32).fill(7),
                newLoginHash: "worker-new-lh",
                newStretchedMasterKey: new Uint8Array(64).fill(9),
              },
            },
          } as MessageEvent);
        });
      });
    }

    vi.stubGlobal("Worker", MockWorker as unknown as typeof Worker);

    const steps: Array<[string, number]> = [];
    const workerDerived = await cryptoClient.deriveChangePasswordKeysAsync(
      email,
      currentPw,
      newPw,
      (step, percent) => steps.push([step, percent])
    );

    expect(steps).toEqual([["Deriving in worker...", 50]]);
    expect(workerDerived.currentLoginHash).toBe("worker-curr-lh");
    expect(workerDerived.newLoginHash).toBe("worker-new-lh");
    expect(workerDerived.newMasterKey).toEqual(new Uint8Array(32).fill(7));
    expect(workerDerived.newStretchedMasterKey).toBeInstanceOf(
      StretchedMasterKey
    );
    expect(workerDerived.newStretchedMasterKey.keybuffer).toEqual(
      new Uint8Array(64).fill(9)
    );
    expect(terminatedCalls).toHaveLength(1);

    // Worker abort must terminate worker and NOT fall back to main thread
    const abortController = new AbortController();
    class HangingWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      terminate = vi.fn();
      postMessage = vi.fn(() => {
        queueMicrotask(() => abortController.abort());
      });
    }
    vi.stubGlobal("Worker", HangingWorker as unknown as typeof Worker);
    const generateMkSpy = vi.spyOn(keyGeneration, "generateMasterKey");

    await expect(
      cryptoClient.deriveChangePasswordKeysAsync(
        email,
        currentPw,
        newPw,
        undefined,
        abortController.signal
      )
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(generateMkSpy).not.toHaveBeenCalled();

    // Main-thread fallback error zeroes intermediate currentMk & newMk buffers
    vi.stubGlobal("Worker", undefined);
    const origGenerateMasterKey = keyGeneration.generateMasterKey;
    const producedMasterKeys: Uint8Array[] = [];
    vi.spyOn(keyGeneration, "generateMasterKey").mockImplementation(
      async (e, pw) => {
        const mk = await origGenerateMasterKey(e, pw);
        producedMasterKeys.push(mk);
        return mk;
      }
    );
    vi.spyOn(keyGeneration, "generateStretchedMasterKey").mockRejectedValueOnce(
      new Error("HKDF simulated failure")
    );

    await expect(
      cryptoClient.deriveChangePasswordKeysAsync(email, currentPw, newPw)
    ).rejects.toThrow("HKDF simulated failure");

    expect(producedMasterKeys).toHaveLength(2);
    for (const buf of producedMasterKeys) {
      expect(buf.every((b) => b === 0)).toBe(true);
    }
  }, 15_000);

  it("crypto.worker DERIVE_CHANGE_PASSWORD_KEYS posts progress/result and zeroes all worker key buffers", async () => {
    const postedMessages: Array<{ data: any; options?: any }> = [];
    const mockSelf: {
      onmessage: ((event: MessageEvent) => Promise<void> | void) | null;
      postMessage: (data: any, options?: any) => void;
    } = {
      onmessage: null,
      postMessage: (data: any, options?: any) => {
        postedMessages.push({ data, options });
      },
    };

    vi.stubGlobal("self", mockSelf);
    vi.resetModules();

    const freshKeyGeneration = await import("$lib/key-generation");
    const workerMasterKeys: Uint8Array[] = [];
    const origGenMk = freshKeyGeneration.generateMasterKey;
    vi.spyOn(freshKeyGeneration, "generateMasterKey").mockImplementation(
      async (e, pw) => {
        const buf = await origGenMk(e, pw);
        workerMasterKeys.push(buf);
        return buf;
      }
    );

    const workerSmks: StretchedMasterKey[] = [];
    const origGenSmk = freshKeyGeneration.generateStretchedMasterKey;
    vi.spyOn(
      freshKeyGeneration,
      "generateStretchedMasterKey"
    ).mockImplementation(async (mk) => {
      const smk = await origGenSmk(mk);
      workerSmks.push(smk);
      return smk;
    });

    await import("$lib/workers/crypto.worker");
    expect(mockSelf.onmessage).toBeTypeOf("function");

    await mockSelf.onmessage!({
      data: {
        id: "task-change-pw-1",
        type: "DERIVE_CHANGE_PASSWORD_KEYS",
        payload: {
          email: "worker-unit@mellonpass.test",
          currentMasterPassword: "OldWorkerUnitPassword!2025",
          newMasterPassword: "NewWorkerUnitPassword!2026",
        },
      },
    } as MessageEvent);

    const progressMsgs = postedMessages.filter(
      (m) => m.data.type === "PROGRESS"
    );
    const resultMsg = postedMessages.find((m) => m.data.type === "RESULT");
    expect(progressMsgs.length).toBeGreaterThanOrEqual(4);
    expect(resultMsg).toBeDefined();
    expect(resultMsg!.data.id).toBe("task-change-pw-1");
    expect(resultMsg!.data.result.currentLoginHash).toBeTypeOf("string");
    expect(resultMsg!.data.result.newLoginHash).toBeTypeOf("string");
    expect(resultMsg!.data.result.newMasterKey).toBeInstanceOf(Uint8Array);
    expect(resultMsg!.data.result.newStretchedMasterKey).toBeInstanceOf(
      Uint8Array
    );
    expect(resultMsg!.options?.transfer).toHaveLength(2);

    // Worker's internal MK & SMK buffers must all be zeroed
    expect(workerMasterKeys).toHaveLength(2);
    for (const mk of workerMasterKeys) {
      expect(mk.every((b) => b === 0)).toBe(true);
    }
    expect(workerSmks).toHaveLength(1);
    expect(workerSmks[0].keybuffer.every((b) => b === 0)).toBe(true);
  }, 15_000);

  it("BaseKey.zero() wipes internal AES and HMAC buffers so previously protected payloads fail MAC verification", async () => {
    const smk = new StretchedMasterKey(
      crypto.getRandomValues(new Uint8Array(64))
    );
    const sk = new SymmetricKey(crypto.getRandomValues(new Uint8Array(64)));

    const psk = await smk.protectKey(sk);
    const ciphertext = await sk.encrypt(
      new TextEncoder().encode("secret-payload")
    );

    smk.zero();
    sk.zero();

    expect(smk.keybuffer.every((b) => b === 0)).toBe(true);
    expect(sk.keybuffer.every((b) => b === 0)).toBe(true);

    await expect(smk.extractKey(psk)).rejects.toThrow("Invalid MAC signature!");
    await expect(sk.decryptText(ciphertext)).rejects.toThrow(
      "Invalid MAC signature!"
    );

    // Independently verify aeskeyBuffer (and mackeyBuffer) were zeroed: encrypting with
    // the zeroed key must be decryptable by a fresh all-zero key.
    const zeroedProbeCiphertext = await sk.encrypt(
      new TextEncoder().encode("zeroed-probe")
    );
    const allZeroSk = new SymmetricKey(new Uint8Array(64));
    await expect(allZeroSk.decryptText(zeroedProbeCiphertext)).resolves.toBe(
      "zeroed-probe"
    );
  });

  it("rewrapSymmetricKey rejects wrong-length or zeroed keys", async () => {
    const validSk = new SymmetricKey(
      crypto.getRandomValues(new Uint8Array(64))
    );
    const validSmk = new StretchedMasterKey(
      crypto.getRandomValues(new Uint8Array(64))
    );

    const shortSk = new SymmetricKey(new Uint8Array(32).fill(1));
    await expect(rewrapSymmetricKey(shortSk, validSmk)).rejects.toThrow(
      "Invalid SymmetricKey length: expected 64 bytes, received 32"
    );

    const zeroedSk = new SymmetricKey(new Uint8Array(64).fill(1));
    zeroedSk.zero();
    await expect(rewrapSymmetricKey(zeroedSk, validSmk)).rejects.toThrow(
      "Invalid SymmetricKey: key material is zeroed"
    );

    const shortSmk = new StretchedMasterKey(new Uint8Array(32).fill(2));
    await expect(rewrapSymmetricKey(validSk, shortSmk)).rejects.toThrow(
      "Invalid StretchedMasterKey length: expected 64 bytes, received 32"
    );

    const zeroedSmk = new StretchedMasterKey(new Uint8Array(64).fill(2));
    zeroedSmk.zero();
    await expect(rewrapSymmetricKey(validSk, zeroedSmk)).rejects.toThrow(
      "Invalid StretchedMasterKey: key material is zeroed"
    );

    validSk.zero();
    validSmk.zero();
    shortSk.zero();
    shortSmk.zero();
  });

  it("deriveChangePasswordKeysAsync aborts mid-flight during main-thread fallback and zeroes intermediate buffers", async () => {
    vi.stubGlobal("Worker", undefined);

    const origGenMk = keyGeneration.generateMasterKey;
    const producedMasterKeys: Uint8Array[] = [];
    vi.spyOn(keyGeneration, "generateMasterKey").mockImplementation(
      async (e, pw) => {
        const mk = await origGenMk(e, pw);
        producedMasterKeys.push(mk);
        return mk;
      }
    );

    const abortController = new AbortController();
    await expect(
      cryptoClient.deriveChangePasswordKeysAsync(
        "fallback-abort@mellonpass.test",
        "CurrentPass!2025",
        "NewPass!2026",
        (_step, percent) => {
          if (percent === 35) {
            abortController.abort();
          }
        },
        abortController.signal
      )
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(producedMasterKeys).toHaveLength(1);
    expect(producedMasterKeys[0].every((b) => b === 0)).toBe(true);
  }, 15_000);

  it("deriveChangePasswordKeysAsync does not fall back to main thread on worker ERROR or cross-realm AbortError", async () => {
    expect(isAbortError({ name: "AbortError" })).toBe(true);
    expect(isAbortError({ message: "Operation aborted" })).toBe(true);
    expect(isAbortError(new Error("Other error"))).toBe(false);
    expect(isAbortError(null)).toBe(false);

    class ErrorWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      terminate = vi.fn();
      postMessage = vi.fn((msg: any) => {
        queueMicrotask(() => {
          this.onmessage?.({
            data: {
              id: msg.id,
              type: "ERROR",
              error: "Worker derivation exploded",
            },
          } as MessageEvent);
        });
      });
    }

    vi.stubGlobal("Worker", ErrorWorker as unknown as typeof Worker);
    const generateMkSpy = vi.spyOn(keyGeneration, "generateMasterKey");

    await expect(
      cryptoClient.deriveChangePasswordKeysAsync(
        "worker-error@mellonpass.test",
        "CurrentPass!2025",
        "NewPass!2026"
      )
    ).rejects.toThrow("Worker derivation exploded");
    expect(generateMkSpy).not.toHaveBeenCalled();

    class CrossRealmAbortWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((err: unknown) => void) | null = null;
      terminate = vi.fn();
      postMessage = vi.fn(() => {
        queueMicrotask(() => {
          this.onerror?.({ name: "AbortError" });
        });
      });
    }

    vi.stubGlobal("Worker", CrossRealmAbortWorker as unknown as typeof Worker);

    await expect(
      cryptoClient.deriveChangePasswordKeysAsync(
        "cross-realm-abort@mellonpass.test",
        "CurrentPass!2025",
        "NewPass!2026"
      )
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(generateMkSpy).not.toHaveBeenCalled();
  });

  it("crypto.worker zeroes unsent transfer buffers if postMessage throws on RESULT", async () => {
    const capturedTransfers: Uint8Array[] = [];
    const postedMessages: Array<{ data: any; options?: any }> = [];
    const mockSelf: {
      onmessage: ((event: MessageEvent) => Promise<void> | void) | null;
      postMessage: (data: any, options?: any) => void;
    } = {
      onmessage: null,
      postMessage: (data: any, options?: any) => {
        if (data.type === "RESULT") {
          capturedTransfers.push(
            data.result.newMasterKey,
            data.result.newStretchedMasterKey
          );
          throw new Error("DataCloneError simulation");
        }
        postedMessages.push({ data, options });
      },
    };

    vi.stubGlobal("self", mockSelf);
    vi.resetModules();

    const freshKeyGeneration = await import("$lib/key-generation");
    const workerMasterKeys: Uint8Array[] = [];
    const origGenMk = freshKeyGeneration.generateMasterKey;
    vi.spyOn(freshKeyGeneration, "generateMasterKey").mockImplementation(
      async (e, pw) => {
        const buf = await origGenMk(e, pw);
        workerMasterKeys.push(buf);
        return buf;
      }
    );

    await import("$lib/workers/crypto.worker");

    await mockSelf.onmessage!({
      data: {
        id: "task-post-throw",
        type: "DERIVE_CHANGE_PASSWORD_KEYS",
        payload: {
          email: "worker-throw@mellonpass.test",
          currentMasterPassword: "OldWorkerThrowPassword!2025",
          newMasterPassword: "NewWorkerThrowPassword!2026",
        },
      },
    } as MessageEvent);

    const errorMsg = postedMessages.find((m) => m.data.type === "ERROR");
    expect(errorMsg).toBeDefined();
    expect(errorMsg!.data.error).toBe("DataCloneError simulation");

    expect(workerMasterKeys).toHaveLength(2);
    for (const mk of workerMasterKeys) {
      expect(mk.every((b) => b === 0)).toBe(true);
    }

    expect(capturedTransfers).toHaveLength(2);
    for (const transferBuf of capturedTransfers) {
      expect(transferBuf.every((b) => b === 0)).toBe(true);
    }
  }, 15_000);
});
