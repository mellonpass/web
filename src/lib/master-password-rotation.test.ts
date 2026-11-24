import { afterEach, describe, expect, it, vi } from "vitest";
import { arrayBufferToBase64 } from "$lib/bytes";
import * as cryptoClient from "$lib/crypto-client";
import {
  extractSymmetricKey,
  generateMasterKey,
  generateProtectedSymmetricKey,
  generateStretchedMasterKey,
} from "$lib/key-generation";
import * as keyGeneration from "$lib/key-generation";
import { changePassword } from "$lib/services/accounts";
import { rotateMasterPassword } from "$lib/vaults";

function createSpyStorage() {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, val: string) => {
      store.set(key, val);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
  };
}

describe("Master Password rotation service & orchestration", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("changePassword sends credentials: include, CSRF header, and optional hint", async () => {
    vi.stubGlobal("document", { cookie: "csrftoken=csrf-token-123" });
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user_email: "alice@mellonpass.test",
          message: "Master password updated successfully.",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Without hint: hint key must be omitted
    const res1 = await changePassword({
      currentLoginHash: "curr-lh",
      newLoginHash: "new-lh",
      newProtectedSymmetricKey: "new-psk",
    });
    expect(res1.data.message).toBe("Master password updated successfully.");

    const [url1, init1] = fetchMock.mock.calls[0];
    expect(url1).toBe("http://localhost:8000/accounts/change-password");
    expect(init1.method).toBe("POST");
    expect(init1.credentials).toBe("include");
    expect(init1.headers["X-CSRFToken"]).toBe("csrf-token-123");
    const body1 = JSON.parse(init1.body as string);
    expect(body1).toEqual({
      current_login_hash: "curr-lh",
      new_login_hash: "new-lh",
      new_protected_symmetric_key: "new-psk",
    });
    expect("hint" in body1).toBe(false);

    // With hint: hint key is included
    await changePassword({
      currentLoginHash: "curr-lh",
      newLoginHash: "new-lh",
      newProtectedSymmetricKey: "new-psk",
      hint: "My childhood pet",
    });
    const body2 = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(body2.hint).toBe("My childhood pet");

    // Wrong current password (422) propagates error & statusCode
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: async () => ({ error: "Invalid current master password." }),
    });
    await expect(
      changePassword({
        currentLoginHash: "wrong-lh",
        newLoginHash: "new-lh",
        newProtectedSymmetricKey: "new-psk",
      })
    ).rejects.toEqual({
      error: "Invalid current master password.",
      code: undefined,
      statusCode: 422,
    });
  });

  it("rotateMasterPassword zeroes all temporary key buffers on success and never touches storage", async () => {
    const email = "bob@mellonpass.test";
    const oldPassword = "OldBobPassword!2025";
    const newPassword = "NewBobPassword!2026#";

    const oldMk = await generateMasterKey(email, oldPassword);
    const oldMkBase64 = arrayBufferToBase64(oldMk);
    const oldSmk = await generateStretchedMasterKey(oldMk);
    const oldPsk = await generateProtectedSymmetricKey(oldSmk);
    const oldEpsk = oldPsk.toBase64();
    const expectedSk = await extractSymmetricKey(oldMkBase64, oldEpsk);

    const localStorageSpy = createSpyStorage();
    const sessionStorageSpy = createSpyStorage();
    vi.stubGlobal("localStorage", localStorageSpy);
    vi.stubGlobal("sessionStorage", sessionStorageSpy);
    vi.stubGlobal("document", { cookie: "csrftoken=tok-abc" });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          user_email: email,
          message: "Master password updated successfully.",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    // Track derived keys & extracted SK buffers to assert they are zeroed
    const origDerive = cryptoClient.deriveChangePasswordKeysAsync;
    let capturedDerived: cryptoClient.ChangePasswordDerivedKeys | null = null;
    vi.spyOn(cryptoClient, "deriveChangePasswordKeysAsync").mockImplementation(
      async (...args) => {
        const res = await origDerive(...args);
        capturedDerived = res;
        return res;
      }
    );

    const origExtract = keyGeneration.extractSymmetricKey;
    let capturedSkBuffer: Uint8Array | null = null;
    vi.spyOn(keyGeneration, "extractSymmetricKey").mockImplementation(
      async (mkArg, pskArg) => {
        const res = await origExtract(mkArg, pskArg);
        capturedSkBuffer = res.keybuffer;
        return res;
      }
    );

    const result = await rotateMasterPassword({
      email,
      currentMasterPassword: oldPassword,
      newMasterPassword: newPassword,
      currentMkBase64: oldMkBase64,
      currentEpsk: oldEpsk,
      hint: "Favorite mountain",
    });

    expect(result.aborted).toBe(false);
    expect(result.newMkBase64).toBeTruthy();
    expect(result.newEpsk).toBeTruthy();

    // Never persisted to localStorage or sessionStorage
    expect(localStorageSpy.setItem).not.toHaveBeenCalled();
    expect(sessionStorageSpy.setItem).not.toHaveBeenCalled();

    // All temporary key buffers were zeroed
    expect(capturedDerived).not.toBeNull();
    expect(capturedDerived!.newMasterKey.every((b) => b === 0)).toBe(true);
    expect(
      capturedDerived!.newStretchedMasterKey.keybuffer.every((b) => b === 0)
    ).toBe(true);
    expect(capturedSkBuffer).not.toBeNull();
    expect(capturedSkBuffer!.every((b) => b === 0)).toBe(true);

    // Unwrapping with returned newMkBase64 & newEpsk yields exact same SK
    vi.restoreAllMocks();
    const rotatedSk = await extractSymmetricKey(
      result.newMkBase64!,
      result.newEpsk!
    );
    expect(rotatedSk.keybuffer).toEqual(expectedSk.keybuffer);

    // Old password cannot unwrap newEpsk
    await expect(
      extractSymmetricKey(oldMkBase64, result.newEpsk!)
    ).rejects.toThrow("Invalid MAC signature!");

    oldMk.fill(0);
    oldSmk.zero();
    expectedSk.zero();
    rotatedSk.zero();
  }, 30_000);

  it("rotateMasterPassword zeroes all temporary key buffers when API rejects (wrong current password) or aborts", async () => {
    const email = "carol@mellonpass.test";
    const realPassword = "CarolRealPassword!2025";
    const wrongCurrentPassword = "WrongAttemptPassword!2025";
    const newPassword = "CarolNewPassword!2026#";

    const realMk = await generateMasterKey(email, realPassword);
    const realMkBase64 = arrayBufferToBase64(realMk);
    const realSmk = await generateStretchedMasterKey(realMk);
    const realPsk = await generateProtectedSymmetricKey(realSmk);
    const realEpsk = realPsk.toBase64();

    const localStorageSpy = createSpyStorage();
    const sessionStorageSpy = createSpyStorage();
    vi.stubGlobal("localStorage", localStorageSpy);
    vi.stubGlobal("sessionStorage", sessionStorageSpy);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: "Unprocessable Entity",
      json: async () => ({ error: "Invalid current master password." }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const origDerive = cryptoClient.deriveChangePasswordKeysAsync;
    let capturedDerived: cryptoClient.ChangePasswordDerivedKeys | null = null;
    vi.spyOn(cryptoClient, "deriveChangePasswordKeysAsync").mockImplementation(
      async (...args) => {
        const res = await origDerive(...args);
        capturedDerived = res;
        return res;
      }
    );

    const origExtract = keyGeneration.extractSymmetricKey;
    let capturedSkBuffer: Uint8Array | null = null;
    vi.spyOn(keyGeneration, "extractSymmetricKey").mockImplementation(
      async (mkArg, pskArg) => {
        const res = await origExtract(mkArg, pskArg);
        capturedSkBuffer = res.keybuffer;
        return res;
      }
    );

    await expect(
      rotateMasterPassword({
        email,
        currentMasterPassword: wrongCurrentPassword,
        newMasterPassword: newPassword,
        currentMkBase64: realMkBase64,
        currentEpsk: realEpsk,
      })
    ).rejects.toEqual({
      error: "Invalid current master password.",
      code: undefined,
      statusCode: 422,
    });

    // Temporary key buffers must be zeroed even on error
    expect(capturedDerived!.newMasterKey.every((b) => b === 0)).toBe(true);
    expect(
      capturedDerived!.newStretchedMasterKey.keybuffer.every((b) => b === 0)
    ).toBe(true);
    expect(capturedSkBuffer!.every((b) => b === 0)).toBe(true);
    expect(localStorageSpy.setItem).not.toHaveBeenCalled();
    expect(sessionStorageSpy.setItem).not.toHaveBeenCalled();

    // Abort mid-request via AbortController zeroes buffers and returns { aborted: true }
    const abortController = new AbortController();
    fetchMock.mockImplementationOnce(async () => {
      abortController.abort();
      return {
        ok: true,
        json: async () => ({ data: { message: "ok" } }),
      };
    });

    const abortedResult = await rotateMasterPassword({
      email,
      currentMasterPassword: realPassword,
      newMasterPassword: newPassword,
      currentMkBase64: realMkBase64,
      currentEpsk: realEpsk,
      signal: abortController.signal,
    });

    expect(abortedResult).toEqual({
      aborted: true,
      newMkBase64: null,
      newEpsk: null,
      response: null,
    });
    expect(capturedDerived!.newMasterKey.every((b) => b === 0)).toBe(true);
    expect(
      capturedDerived!.newStretchedMasterKey.keybuffer.every((b) => b === 0)
    ).toBe(true);
    expect(capturedSkBuffer!.every((b) => b === 0)).toBe(true);

    realMk.fill(0);
    realSmk.zero();
  }, 30_000);
});
