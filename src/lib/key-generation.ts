import { arrayBufferToBase64, base64ToArrayBuffer } from "$lib/bytes";
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
): Promise<Uint8Array> => {
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
  masterKey: Uint8Array
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
  return await smk.protectKey(sk);
};

export const generateLoginhash = async (
  masterKey: Uint8Array,
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
  return arrayBufferToBase64(buffer);
};

export const generateCipherKey = (): CipherKey => {
  const ckeyBuffer = crypto.getRandomValues(new Uint8Array(64));
  return new CipherKey(ckeyBuffer);
};

export async function extractSymmetricKey(
  mk: string,
  key: string | ProtectedSymmetricKey
): Promise<SymmetricKey> {
  const smk = await generateStretchedMasterKey(base64ToArrayBuffer(mk));
  let psk;
  if (typeof key == "string") {
    psk = await ProtectedSymmetricKey.fromBase64(key);
  } else {
    psk = key;
  }
  return await smk.extractKey(psk);
}

export async function extractCipherKey(
  sk: SymmetricKey,
  epck: string
): Promise<CipherKey> {
  const pck = await ProtectedCipherKey.fromBase64(epck);
  return await sk.extractKey(pck);
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

function tryParseJwkJson(str: string): JsonWebKey | null {
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === "object" && parsed.kty === "RSA") {
      return parsed as JsonWebKey;
    }
  } catch {
    // not valid JSON
  }
  return null;
}

/**
 * Imports an RSA-OAEP public key from a JsonWebKey object or encoded string.
 * Supports raw JWK object, JSON string, base64-encoded JSON string, and double-base64
 * encoded JSON string (as stored during account setup).
 */
export async function importRsaPublicKey(
  publicKey: JsonWebKey | string
): Promise<CryptoKey> {
  let jwk: JsonWebKey | null = null;

  if (typeof publicKey === "object" && publicKey !== null) {
    jwk = publicKey;
  } else if (typeof publicKey === "string") {
    const raw = publicKey.trim();
    // 1. Direct JSON string
    jwk = tryParseJwkJson(raw);

    // 2. Base64-encoded string
    if (!jwk) {
      try {
        const decoded1 = new TextDecoder().decode(base64ToArrayBuffer(raw));
        jwk = tryParseJwkJson(decoded1);
        if (!jwk) {
          // 3. Double-base64 encoded string
          const decoded2 = new TextDecoder().decode(
            base64ToArrayBuffer(decoded1)
          );
          jwk = tryParseJwkJson(decoded2);
        }
      } catch {
        // failed decoding
      }
    }
  }

  if (!jwk) {
    throw new Error("Invalid RSA public key format: unable to parse JWK");
  }

  if ("d" in jwk) {
    throw new Error(
      "Expected public key JWK, received private key JWK with private exponent 'd'"
    );
  }

  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

/**
 * Decrypts the user's RSA private key using their unlocked SymmetricKey.
 * The private key was encrypted via sk.encrypt() during account setup
 * and returned by login/unlock as rsa_protected_key.
 *
 * @param sk Unlocked SymmetricKey
 * @param rsaProtectedKey Encrypted and MAC-protected private key string
 * @returns CryptoKey for RSA-OAEP decryption
 */
export async function decryptPrivateKeyWithSymmetricKey(
  sk: SymmetricKey,
  rsaProtectedKey: string
): Promise<CryptoKey> {
  if (!rsaProtectedKey || typeof rsaProtectedKey !== "string") {
    throw new Error("Missing RSA protected key string");
  }
  const decryptedJson = await sk.decryptText(rsaProtectedKey);
  const jwk = JSON.parse(decryptedJson) as JsonWebKey;
  return await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    false,
    ["decrypt"]
  );
}

/**
 * Generates a fresh 512-bit (64-byte) random Organization Symmetric Key (OSK).
 * Uses the same SymmetricKey structure as the user's vault key (AES-CTR 256-bit + HMAC-SHA256 256-bit).
 */
export const generateOrganizationKey = (): SymmetricKey => {
  const oskBuffer = crypto.getRandomValues(new Uint8Array(64));
  return new SymmetricKey(oskBuffer);
};

/**
 * Encrypts a 64-byte Organization Symmetric Key (OSK) using a recipient's RSA-OAEP public key.
 *
 * @param publicKey Recipient's CryptoKey, JsonWebKey, or encoded string
 * @param osk 64-byte Uint8Array of the Organization Symmetric Key, or a SymmetricKey instance
 * @returns Base64-encoded ciphertext string
 */
export async function encryptOrgKeyWithPublicKey(
  publicKey: CryptoKey | JsonWebKey | string,
  osk: SymmetricKey | Uint8Array
): Promise<string> {
  const isCryptoKey =
    (typeof CryptoKey !== "undefined" && publicKey instanceof CryptoKey) ||
    (typeof publicKey === "object" &&
      publicKey !== null &&
      "algorithm" in publicKey &&
      "type" in publicKey);

  const key = isCryptoKey
    ? (publicKey as CryptoKey)
    : await importRsaPublicKey(publicKey as JsonWebKey | string);

  if (key.type !== "public") {
    throw new Error(
      `Expected public CryptoKey for encryption, received '${key.type}'`
    );
  }

  const oskBytes = osk instanceof Uint8Array ? osk : osk.keybuffer;
  if (!oskBytes || oskBytes.byteLength !== 64) {
    throw new Error(
      `Invalid OSK length: expected 64 bytes, received ${oskBytes?.byteLength ?? 0}`
    );
  }

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    key,
    oskBytes
  );
  return arrayBufferToBase64(encryptedBuffer);
}

/**
 * Decrypts an RSA-OAEP encrypted Organization Symmetric Key (OSK) using the user's RSA private key.
 *
 * @param privateKey Decrypted RSA-OAEP private CryptoKey
 * @param encryptedOskBase64 Base64-encoded encrypted OSK ciphertext
 * @returns Decrypted SymmetricKey instance for the organization vault
 */
export async function decryptOrgKeyWithPrivateKey(
  privateKey: CryptoKey,
  encryptedOskBase64: string
): Promise<SymmetricKey> {
  if (privateKey.type !== "private") {
    throw new Error(
      `Expected private CryptoKey for decryption, received '${privateKey.type}'`
    );
  }

  const encryptedBytes = base64ToArrayBuffer(encryptedOskBase64);
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    encryptedBytes
  );

  if (decryptedBuffer.byteLength !== 64) {
    throw new Error(
      `Invalid OSK length: expected 64 bytes, received ${decryptedBuffer.byteLength}`
    );
  }

  return new SymmetricKey(new Uint8Array(decryptedBuffer));
}
