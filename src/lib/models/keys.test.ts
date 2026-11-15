import { describe, expect, it } from "vitest";
import { arrayBufferToBase64, base64ToArrayBuffer } from "$lib/bytes";
import {
  AESHMACKey,
  CipherKey,
  ProtectedCipherKey,
  ProtectedData,
  ProtectedSymmetricKey,
  StretchedMasterKey,
  SymmetricKey,
} from "$lib/models/keys";

function makeDeterministicBytes(length: number, offset = 0): Uint8Array {
  const bytes = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    bytes[i] = (i + offset) & 0xff;
  }
  return bytes;
}

class TestAESHMACKey extends AESHMACKey {
  async rawEncryptSign(data: Uint8Array): Promise<Uint8Array> {
    return this.encryptSign(data);
  }

  async rawVerifyDecrypt(
    data: Uint8Array,
    mac: Uint8Array,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    return this.verifyDecrypt(data, mac, iv);
  }
}

describe("ProtectedData byte layout", () => {
  it("slices [Ciphertext (N) | HMAC-SHA256 (32B) | IV (16B)] accurately", () => {
    const ciphertext = makeDeterministicBytes(24, 1);
    const mac = makeDeterministicBytes(32, 100);
    const iv = makeDeterministicBytes(16, 200);
    const combined = new Uint8Array([...ciphertext, ...mac, ...iv]);

    const pData = new ProtectedData(combined);

    expect(pData.data).toEqual(ciphertext);
    expect(pData.mac).toEqual(mac);
    expect(pData.iv).toEqual(iv);
    expect(pData.data.byteLength).toBe(24);
    expect(pData.mac.byteLength).toBe(32);
    expect(pData.iv.byteLength).toBe(16);
  });

  it("handles 0-byte ciphertext with 32-byte MAC and 16-byte IV", () => {
    const mac = makeDeterministicBytes(32, 10);
    const iv = makeDeterministicBytes(16, 50);
    const combined = new Uint8Array([...mac, ...iv]);

    const pData = new ProtectedData(combined);

    expect(pData.data.byteLength).toBe(0);
    expect(pData.mac).toEqual(mac);
    expect(pData.iv).toEqual(iv);
  });
});

describe("BaseKey key slicing and Base64 serialization", () => {
  it("uses bytes [0..32] for AES-256-CTR and [32..64] for HMAC-SHA256", async () => {
    const keyBytes = makeDeterministicBytes(64, 7);
    const ck = new CipherKey(keyBytes);
    const plaintext = new TextEncoder().encode("Key slicing check");

    const encoded = await ck.encrypt(plaintext);
    const raw = base64ToArrayBuffer(atob(encoded));
    const pData = new ProtectedData(raw);

    // Independently verify HMAC using [32..64]
    const hmacKey = await crypto.subtle.importKey(
      "raw",
      keyBytes.slice(32, 64),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const macInput = new Uint8Array([...pData.data, ...pData.iv]);
    const valid = await crypto.subtle.verify("HMAC", hmacKey, pData.mac, macInput);
    expect(valid).toBe(true);

    // Independently decrypt AES-256-CTR using [0..32]
    const aesKey = await crypto.subtle.importKey(
      "raw",
      keyBytes.slice(0, 32),
      { name: "AES-CTR" },
      false,
      ["decrypt"]
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CTR", counter: pData.iv, length: 128 },
      aesKey,
      pData.data
    );
    expect(new Uint8Array(decrypted)).toEqual(plaintext);
  });

  it("round-trips toBase64 and fromBase64 across key classes", () => {
    const raw64 = makeDeterministicBytes(64, 15);
    const raw112 = makeDeterministicBytes(112, 33);

    const smk = new StretchedMasterKey(raw64);
    expect(StretchedMasterKey.fromBase64(smk.toBase64()).keybuffer).toEqual(raw64);

    const sk = new SymmetricKey(raw64);
    expect(SymmetricKey.fromBase64(sk.toBase64()).keybuffer).toEqual(raw64);

    const ck = new CipherKey(raw64);
    expect(CipherKey.fromBase64(ck.toBase64()).keybuffer).toEqual(raw64);

    const psk = new ProtectedSymmetricKey(raw112);
    const decodedPsk = ProtectedSymmetricKey.fromBase64(psk.toBase64());
    expect(decodedPsk.keybuffer).toEqual(raw112);
    expect(decodedPsk.key).toEqual(raw112.slice(0, 64));
    expect(decodedPsk.mac).toEqual(raw112.slice(64, 96));
    expect(decodedPsk.iv).toEqual(raw112.slice(96, 112));

    const pck = new ProtectedCipherKey(raw112);
    const decodedPck = ProtectedCipherKey.fromBase64(pck.toBase64());
    expect(decodedPck.keybuffer).toEqual(raw112);
    expect(decodedPck.key).toEqual(raw112.slice(0, 64));
    expect(decodedPck.mac).toEqual(raw112.slice(64, 96));
    expect(decodedPck.iv).toEqual(raw112.slice(96, 112));
  });
});

describe("AESHMACKey Encrypt-then-MAC and tamper detection", () => {
  it("encrypts and decrypts empty, ASCII, Unicode, and multi-KB payloads", async () => {
    const ck = new CipherKey(makeDeterministicBytes(64, 42));
    const payloads = [
      "",
      "MellonPass secret value",
      "🔐 MellonPass 零知識 vault — café naïve résumé",
      "A".repeat(4096),
    ];

    for (const plaintext of payloads) {
      const encoded = await ck.encrypt(new TextEncoder().encode(plaintext));
      const decrypted = await ck.decryptText(encoded);
      expect(decrypted).toBe(plaintext);
    }
  });

  it("uses a fresh random 16-byte IV per encryption", async () => {
    const ck = new CipherKey(makeDeterministicBytes(64, 99));
    const data = new TextEncoder().encode("identical-plaintext");

    const enc1 = await ck.encrypt(data);
    const enc2 = await ck.encrypt(data);

    expect(enc1).not.toBe(enc2);
    expect(await ck.decryptText(enc1)).toBe("identical-plaintext");
    expect(await ck.decryptText(enc2)).toBe("identical-plaintext");
  });

  it("throws 'Invalid MAC signature!' immediately on tampered ciphertext, MAC, or IV bytes", async () => {
    const ck = new TestAESHMACKey(makeDeterministicBytes(64, 5));
    const plaintext = "Sensitive credential payload";
    const encoded = await ck.encrypt(new TextEncoder().encode(plaintext));
    const raw = base64ToArrayBuffer(atob(encoded));

    // Tamper ciphertext byte
    const tamperedCiphertext = new Uint8Array(raw);
    tamperedCiphertext[0] ^= 0xff;
    await expect(
      ck.decryptText(btoa(arrayBufferToBase64(tamperedCiphertext)))
    ).rejects.toThrow("Invalid MAC signature!");

    // Tamper MAC byte (within [length - 48, length - 16))
    const tamperedMac = new Uint8Array(raw);
    tamperedMac[tamperedMac.length - 20] ^= 0xff;
    await expect(
      ck.decryptText(btoa(arrayBufferToBase64(tamperedMac)))
    ).rejects.toThrow("Invalid MAC signature!");

    // Tamper IV byte (within last 16 bytes)
    const tamperedIv = new Uint8Array(raw);
    tamperedIv[tamperedIv.length - 1] ^= 0xff;
    await expect(
      ck.decryptText(btoa(arrayBufferToBase64(tamperedIv)))
    ).rejects.toThrow("Invalid MAC signature!");

    // Also verify verifyDecrypt() directly
    const pData = new ProtectedData(raw);
    const badMac = new Uint8Array(pData.mac);
    badMac[0] ^= 0x01;
    await expect(ck.rawVerifyDecrypt(pData.data, badMac, pData.iv)).rejects.toThrow(
      "Invalid MAC signature!"
    );

    const badData = new Uint8Array(pData.data);
    badData[0] ^= 0x01;
    await expect(ck.rawVerifyDecrypt(badData, pData.mac, pData.iv)).rejects.toThrow(
      "Invalid MAC signature!"
    );

    const badIv = new Uint8Array(pData.iv);
    badIv[0] ^= 0x01;
    await expect(ck.rawVerifyDecrypt(pData.data, pData.mac, badIv)).rejects.toThrow(
      "Invalid MAC signature!"
    );
  });

  it("throws 'Invalid MAC signature!' when decrypting with the wrong key", async () => {
    const ck1 = new CipherKey(makeDeterministicBytes(64, 1));
    const ck2 = new CipherKey(makeDeterministicBytes(64, 2));

    const encoded = await ck1.encrypt(new TextEncoder().encode("secret"));
    await expect(ck2.decryptText(encoded)).rejects.toThrow("Invalid MAC signature!");
  });
});

describe("Key wrapping classes (SMK -> PSK -> SK -> PCK -> CK)", () => {
  it("wraps and unwraps SymmetricKey and CipherKey with exact 112-byte protected payloads", async () => {
    const smk = new StretchedMasterKey(makeDeterministicBytes(64, 11));
    const sk = new SymmetricKey(makeDeterministicBytes(64, 22));
    const ck = new CipherKey(makeDeterministicBytes(64, 33));

    const psk = await smk.protectKey(sk);
    expect(psk).toBeInstanceOf(ProtectedSymmetricKey);
    expect(psk.keybuffer.byteLength).toBe(112);
    expect(psk.key.byteLength).toBe(64);
    expect(psk.mac.byteLength).toBe(32);
    expect(psk.iv.byteLength).toBe(16);

    const extractedSk = await smk.extractKey(psk);
    expect(extractedSk).toBeInstanceOf(SymmetricKey);
    expect(extractedSk.keybuffer).toEqual(sk.keybuffer);

    const pck = await extractedSk.protectKey(ck);
    expect(pck).toBeInstanceOf(ProtectedCipherKey);
    expect(pck.keybuffer.byteLength).toBe(112);
    expect(pck.key.byteLength).toBe(64);
    expect(pck.mac.byteLength).toBe(32);
    expect(pck.iv.byteLength).toBe(16);

    const extractedCk = await extractedSk.extractKey(pck);
    expect(extractedCk).toBeInstanceOf(CipherKey);
    expect(extractedCk.keybuffer).toEqual(ck.keybuffer);
  });

  it("rejects tampered ProtectedSymmetricKey and ProtectedCipherKey on extractKey", async () => {
    const smk = new StretchedMasterKey(makeDeterministicBytes(64, 71));
    const sk = new SymmetricKey(makeDeterministicBytes(64, 72));
    const ck = new CipherKey(makeDeterministicBytes(64, 73));

    const psk = await smk.protectKey(sk);
    const tamperedPskKey = new Uint8Array(psk.keybuffer);
    tamperedPskKey[0] ^= 0xff;
    await expect(
      smk.extractKey(new ProtectedSymmetricKey(tamperedPskKey))
    ).rejects.toThrow("Invalid MAC signature!");

    const tamperedPskMac = new Uint8Array(psk.keybuffer);
    tamperedPskMac[64] ^= 0xff;
    await expect(
      smk.extractKey(new ProtectedSymmetricKey(tamperedPskMac))
    ).rejects.toThrow("Invalid MAC signature!");

    const tamperedPskIv = new Uint8Array(psk.keybuffer);
    tamperedPskIv[111] ^= 0xff;
    await expect(
      smk.extractKey(new ProtectedSymmetricKey(tamperedPskIv))
    ).rejects.toThrow("Invalid MAC signature!");

    const pck = await sk.protectKey(ck);
    const tamperedPckKey = new Uint8Array(pck.keybuffer);
    tamperedPckKey[10] ^= 0xff;
    await expect(
      sk.extractKey(new ProtectedCipherKey(tamperedPckKey))
    ).rejects.toThrow("Invalid MAC signature!");

    const tamperedPckMac = new Uint8Array(pck.keybuffer);
    tamperedPckMac[80] ^= 0xff;
    await expect(
      sk.extractKey(new ProtectedCipherKey(tamperedPckMac))
    ).rejects.toThrow("Invalid MAC signature!");

    const tamperedPckIv = new Uint8Array(pck.keybuffer);
    tamperedPckIv[105] ^= 0xff;
    await expect(
      sk.extractKey(new ProtectedCipherKey(tamperedPckIv))
    ).rejects.toThrow("Invalid MAC signature!");
  });
});
