import { arrayBufferToHex, hexToArrayBuffer } from "$lib/bytes";
import {
  CipherKey,
  ProtectedCipherKey,
  ProtectedSymmetricKey,
  StretchedMasterKey,
  SymmetricKey,
} from "$lib/models/keys";

export const generateMasterKey = async (
  email: string,
  masterPassword: string
): Promise<Uint8Array<ArrayBuffer>> => {
  const encoder = new TextEncoder();
  const salt = encoder.encode(email);

  const baseKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const buffer = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: 720000 },
    baseKey,
    256 // The length of the derived bits (256-bit).
  );

  return new Uint8Array(buffer);
};

export const generateStretchedMasterKey = async (
  masterKey: Uint8Array<ArrayBuffer>
): Promise<StretchedMasterKey> => {
  const encoder = new TextEncoder();

  const algorithm = {
    name: "HKDF",
    hash: "SHA-512",
    salt: encoder.encode(""), // Salt is not necessary, we can rely on info.
    info: encoder.encode(
      "For encryption and decryption of protected symmetric key."
    ),
  };

  const baseKey = await crypto.subtle.importKey(
    "raw",
    masterKey,
    "HKDF",
    false,
    ["deriveBits"]
  );

  const buffer = await crypto.subtle.deriveBits(
    algorithm,
    baseKey,
    512 // The length of the derived bits (512-bit).
  );

  return new StretchedMasterKey(new Uint8Array(buffer));
};

export const generateProtectedSymmetricKey = async (
  smk: StretchedMasterKey
): Promise<ProtectedSymmetricKey> => {
  // Create random 512-bit Symmetric Key.
  const rawKey = crypto.getRandomValues(new Uint8Array(64));
  const sk = new SymmetricKey(rawKey);
  return <ProtectedSymmetricKey>await smk.protectKey(sk);
};

export const generateLoginhash = async (
  masterKey: Uint8Array<ArrayBuffer>,
  masterPassword: string
): Promise<string> => {
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
    ["deriveBits"]
  );

  const buffer = await crypto.subtle.deriveBits(algorithm, baseKey, 256);
  return arrayBufferToHex(buffer);
};

export const generateCipherKey = (): CipherKey => {
  const ckeyBuffer = crypto.getRandomValues(new Uint8Array(64));
  return new CipherKey(ckeyBuffer);
};

export async function extractSymmetricKey(
  mk: string,
  key: string | ProtectedSymmetricKey
): Promise<SymmetricKey> {
  const smk = await generateStretchedMasterKey(hexToArrayBuffer(mk));
  let psk;
  if (typeof key == "string") {
    psk = await ProtectedSymmetricKey.fromBase64(key);
  } else {
    psk = key;
  }
  return <SymmetricKey>await smk.extractKey(psk);
}

export async function extractCipherKey(
  sk: SymmetricKey,
  epck: string
): Promise<CipherKey> {
  const pck = await ProtectedCipherKey.fromBase64(epck);
  return <CipherKey>await sk.extractKey(pck);
}

export async function generateAsymmetricKeys(): Promise<
  [JsonWebKey, JsonWebKey]
> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      // https://developer.mozilla.org/en-US/docs/Web/API/RsaHashedKeyGenParams#publicexponent
      publicExponent: new Uint8Array([1, 0, 1]), // 65537
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const jsonPrivateKey = await crypto.subtle.exportKey(
    "jwk",
    keyPair.privateKey
  );

  const jsonPublicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

  return [jsonPrivateKey, jsonPublicKey];
}
