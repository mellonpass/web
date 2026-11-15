import { beforeAll, describe, expect, it } from "vitest";
import { arrayBufferToBase64, base64ToArrayBuffer } from "$lib/bytes";
import {
  decryptOrgKeyWithPrivateKey,
  decryptPrivateKeyWithSymmetricKey,
  encryptOrgKeyWithPublicKey,
  encryptRSAPrivateKey,
  extractCipherKey,
  extractRSAPrivateKey,
  extractSymmetricKey,
  generateAsymmetricKeys,
  generateCipherKey,
  generateLoginHash,
  generateLoginhash,
  generateMasterKey,
  generateOrganizationKey,
  generateOrganizationSymmetricKey,
  generateProtectedSymmetricKey,
  generateRSAOAEPKeyPair,
  generateStretchedMasterKey,
  importRsaPublicKey,
} from "$lib/key-generation";
import { CipherKey, ProtectedSymmetricKey, StretchedMasterKey, SymmetricKey } from "$lib/models/keys";

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("Key derivation (PBKDF2-HMAC-SHA256 & HKDF-SHA512)", () => {
  const email = "alice@example.com";
  const masterPassword = "CorrectHorseBatteryStaple!23";
  const expectedMasterKeyHex =
    "5c51940a88029d4203d7804f6751d029929198acd9c59588feef586faca87f99";
  const expectedMasterKeyBase64 = "XFGUCogCnUID14BPZ1HQKZKRmKzZxZWI/u9Yb6yof5k=";
  const expectedLoginHash = "V0+621j+DNrNvShusu39a8bvkVs2zwiwkGIki0Mpw90=";
  const expectedStretchedKeyHex =
    "8df90b3545ef0427457af86dbe557fd9636a9a3233391380998ebcdce06678bffa6bad3d389879afc415fe5b10a8de93b511b461ce9885928e7af95cb401a3b4";

  it("derives deterministic MasterKey, LoginHash, and StretchedMasterKey vectors", async () => {
    const mk = await generateMasterKey(email, masterPassword);
    expect(mk).toBeInstanceOf(Uint8Array);
    expect(mk.byteLength).toBe(32);
    expect(toHex(mk)).toBe(expectedMasterKeyHex);
    expect(arrayBufferToBase64(mk)).toBe(expectedMasterKeyBase64);

    const loginHash = await generateLoginHash(mk, masterPassword);
    const legacyLoginHash = await generateLoginhash(mk, masterPassword);
    expect(loginHash).toBe(expectedLoginHash);
    expect(legacyLoginHash).toBe(expectedLoginHash);
    expect(loginHash).not.toBe(arrayBufferToBase64(mk));

    const smk = await generateStretchedMasterKey(mk);
    expect(smk).toBeInstanceOf(StretchedMasterKey);
    expect(smk.keybuffer.byteLength).toBe(64);
    expect(toHex(smk.keybuffer)).toBe(expectedStretchedKeyHex);
  }, 15_000);

  it("produces distinct keys for different email salts or master passwords", async () => {
    const mkBase = await generateMasterKey(email, masterPassword);
    const mkDifferentEmail = await generateMasterKey("bob@example.com", masterPassword);
    const mkDifferentPassword = await generateMasterKey(email, "DifferentPassword!23");

    expect(toHex(mkDifferentEmail)).not.toBe(toHex(mkBase));
    expect(toHex(mkDifferentPassword)).not.toBe(toHex(mkBase));

    const lhBase = await generateLoginHash(mkBase, masterPassword);
    const lhDifferentSalt = await generateLoginHash(mkBase, "DifferentPassword!23");
    expect(lhDifferentSalt).not.toBe(lhBase);
  }, 15_000);

  it("generates and extracts SymmetricKey and CipherKey", async () => {
    const mk = await generateMasterKey(email, masterPassword);
    const mkBase64 = arrayBufferToBase64(mk);
    const smk = await generateStretchedMasterKey(mk);

    const psk = await generateProtectedSymmetricKey(smk);
    expect(psk).toBeInstanceOf(ProtectedSymmetricKey);
    expect(psk.keybuffer.byteLength).toBe(112);

    const skFromObject = await extractSymmetricKey(mkBase64, psk);
    const skFromString = await extractSymmetricKey(mkBase64, psk.toBase64());

    expect(skFromObject).toBeInstanceOf(SymmetricKey);
    expect(skFromObject.keybuffer.byteLength).toBe(64);
    expect(skFromString.keybuffer).toEqual(skFromObject.keybuffer);

    const ck = generateCipherKey();
    expect(ck).toBeInstanceOf(CipherKey);
    expect(ck.keybuffer.byteLength).toBe(64);

    const pck = await skFromObject.protectKey(ck);
    const extractedCk = await extractCipherKey(skFromObject, pck.toBase64());
    expect(extractedCk).toBeInstanceOf(CipherKey);
    expect(extractedCk.keybuffer).toEqual(ck.keybuffer);
  }, 15_000);
});

describe("RSA-OAEP-4096 JWK wrapping and OrganizationSymmetricKey exchange", () => {
  let privateJwk: JsonWebKey;
  let publicJwk: JsonWebKey;

  beforeAll(async () => {
    [privateJwk, publicJwk] = await generateRSAOAEPKeyPair();
  }, 30_000);

  it("generates a 4096-bit RSA-OAEP-256 JWK keypair with private exponent omitted from public JWK", () => {
    expect(generateRSAOAEPKeyPair).toBe(generateAsymmetricKeys);
    expect(privateJwk.kty).toBe("RSA");
    expect(privateJwk.alg).toBe("RSA-OAEP-256");
    expect(privateJwk.d).toBeTruthy();

    expect(publicJwk.kty).toBe("RSA");
    expect(publicJwk.alg).toBe("RSA-OAEP-256");
    expect(publicJwk.d).toBeUndefined();
    expect(publicJwk.n).toBeTruthy();

    const modulusBytes = base64ToArrayBuffer(publicJwk.n!);
    expect(modulusBytes.byteLength).toBe(512);
  });

  it("encrypts and extracts RSA private key using SymmetricKey", async () => {
    const sk = new SymmetricKey(crypto.getRandomValues(new Uint8Array(64)));
    const rsaProtectedKey = await encryptRSAPrivateKey(sk, privateJwk);

    const privateKey = await extractRSAPrivateKey(sk, rsaProtectedKey);
    const legacyPrivateKey = await decryptPrivateKeyWithSymmetricKey(sk, rsaProtectedKey);

    expect(privateKey.type).toBe("private");
    expect(privateKey.extractable).toBe(false);
    expect(privateKey.usages).toContain("decrypt");
    expect(privateKey.algorithm.name).toBe("RSA-OAEP");
    expect(legacyPrivateKey.type).toBe("private");

    const wrongSk = new SymmetricKey(crypto.getRandomValues(new Uint8Array(64)));
    await expect(extractRSAPrivateKey(wrongSk, rsaProtectedKey)).rejects.toThrow(
      "Invalid MAC signature!"
    );
    await expect(encryptRSAPrivateKey(sk, publicJwk)).rejects.toThrow(
      "Invalid RSA private key JWK"
    );
    await expect(extractRSAPrivateKey(sk, "")).rejects.toThrow(
      "Missing RSA protected key string"
    );
  });

  it("imports RSA public key from JWK, JSON, single-base64, and double-base64 formats", async () => {
    const jsonStr = JSON.stringify(publicJwk);
    const singleBase64 = arrayBufferToBase64(new TextEncoder().encode(jsonStr));
    const doubleBase64 = btoa(singleBase64);

    const fromJwk = await importRsaPublicKey(publicJwk);
    const fromJson = await importRsaPublicKey(jsonStr);
    const fromSingleB64 = await importRsaPublicKey(singleBase64);
    const fromDoubleB64 = await importRsaPublicKey(doubleBase64);

    for (const key of [fromJwk, fromJson, fromSingleB64, fromDoubleB64]) {
      expect(key.type).toBe("public");
      expect(key.algorithm.name).toBe("RSA-OAEP");
      expect(key.usages).toContain("encrypt");
    }

    await expect(importRsaPublicKey("not-a-valid-jwk")).rejects.toThrow(
      "Invalid RSA public key format"
    );
    await expect(importRsaPublicKey(privateJwk)).rejects.toThrow(
      "Expected public key JWK, received private key JWK"
    );
  });

  it("wraps and unwraps a 512-bit OrganizationSymmetricKey (OSK) via RSA-OAEP-4096", async () => {
    expect(generateOrganizationSymmetricKey).toBe(generateOrganizationKey);

    const sk = new SymmetricKey(crypto.getRandomValues(new Uint8Array(64)));
    const rsaProtectedKey = await encryptRSAPrivateKey(sk, privateJwk);
    const privateCryptoKey = await extractRSAPrivateKey(sk, rsaProtectedKey);

    const osk = generateOrganizationSymmetricKey();
    expect(osk).toBeInstanceOf(SymmetricKey);
    expect(osk.keybuffer.byteLength).toBe(64);

    const doubleBase64Pub = btoa(
      arrayBufferToBase64(new TextEncoder().encode(JSON.stringify(publicJwk)))
    );
    const encryptedOsk = await encryptOrgKeyWithPublicKey(doubleBase64Pub, osk);
    const unwrappedOsk = await decryptOrgKeyWithPrivateKey(
      privateCryptoKey,
      encryptedOsk
    );

    expect(unwrappedOsk).toBeInstanceOf(SymmetricKey);
    expect(unwrappedOsk.keybuffer).toEqual(osk.keybuffer);

    // Also verify encrypting from raw 64-byte Uint8Array works identically
    const encryptedFromRaw = await encryptOrgKeyWithPublicKey(publicJwk, osk.keybuffer);
    const unwrappedFromRaw = await decryptOrgKeyWithPrivateKey(
      privateCryptoKey,
      encryptedFromRaw
    );
    expect(unwrappedFromRaw.keybuffer).toEqual(osk.keybuffer);
  });

  it("rejects invalid OSK lengths and mismatched RSA key types", async () => {
    const publicCryptoKey = await importRsaPublicKey(publicJwk);
    const sk = new SymmetricKey(crypto.getRandomValues(new Uint8Array(64)));
    const privateCryptoKey = await extractRSAPrivateKey(
      sk,
      await encryptRSAPrivateKey(sk, privateJwk)
    );

    await expect(
      encryptOrgKeyWithPublicKey(publicCryptoKey, new Uint8Array(32))
    ).rejects.toThrow("Invalid OSK length: expected 64 bytes, received 32");

    await expect(
      encryptOrgKeyWithPublicKey(privateCryptoKey, new Uint8Array(64))
    ).rejects.toThrow("Expected public CryptoKey for encryption, received 'private'");

    const validCiphertext = await encryptOrgKeyWithPublicKey(
      publicCryptoKey,
      generateOrganizationSymmetricKey()
    );
    await expect(
      decryptOrgKeyWithPrivateKey(publicCryptoKey, validCiphertext)
    ).rejects.toThrow("Expected private CryptoKey for decryption, received 'public'");
  });
});
