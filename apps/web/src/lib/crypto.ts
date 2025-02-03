import { arrayBufferToHex } from "$lib/utils/bytes";
import {
  CipherKey,
  ProtectedSymmetricKey,
  StretchedMasterKey,
  SymmetricKey,
} from "$lib/models";

export const generateMasterKey = async (
  email: string,
  masterPassword: string,
) => {
  const encoder = new TextEncoder();
  const salt = encoder.encode(email);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const buffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: 720000 },
    baseKey,
    256, // The length of the derived bits (256-bit).
  );

  return new Uint8Array(buffer);
};

export const generateStretchedMasterKey = async (
  masterKey: Uint8Array<ArrayBuffer>,
) => {
  const encoder = new TextEncoder();

  const algorithm = {
    name: "HKDF",
    hash: "SHA-512",
    salt: encoder.encode(""), // Salt is not necessary, we can rely on info.
    info: encoder.encode(
      "For encryption and decryption of protected symmetric key.",
    ),
  };

  const baseKey = await crypto.subtle.importKey(
    "raw",
    masterKey,
    "HKDF",
    false,
    ["deriveBits"],
  );

  const buffer = await crypto.subtle.deriveBits(
    algorithm,
    baseKey,
    512, // The length of the derived bits (512-bit).
  );

  return new StretchedMasterKey(new Uint8Array(buffer));
};

export const generateProtectedSymmetricKey = async (
  smk: StretchedMasterKey,
) => {
  // Create random 512-bit Symmetric Key.
  const rawKey = crypto.getRandomValues(new Uint8Array(64));
  const sk = new SymmetricKey(rawKey);
  return (await smk.protectKey(sk)) as ProtectedSymmetricKey;
};

export const generateLoginhash = async (
  masterKey: Uint8Array<ArrayBuffer>,
  masterPassword: string,
) => {
  const encoder = new TextEncoder();
  const salt = encoder.encode(masterPassword);

  const algorithm = {
    name: "PBKDF2",
    hash: "SHA-256",
    salt: salt,
    iterations: 720000,
  };

  const baseKey = await crypto.subtle.importKey(
    "raw",
    masterKey,
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const buffer = await crypto.subtle.deriveBits(algorithm, baseKey, 256);
  return arrayBufferToHex(buffer);
};

export const generateCipherKey = async () => {
  const ckeyBuffer = crypto.getRandomValues(new Uint8Array(64));
  return new CipherKey(ckeyBuffer);
};
