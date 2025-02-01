import { arrayBufferToHex, hexToArrayBuffer } from "$lib/utils/bytes";
import { ProtectedSymmetricKey, StretchedMasterKey } from "$lib/models";

/**
 * Generate a MAC SHA-256 from a message using a key.
 * @param {Uint8Array<ArrayBuffer>} m Message
 * @param {Uint8Array<ArrayBuffer>} k MAC Key
 * @returns {Promise<Uint8Array<ArrayBuffer>>} HMAC.
 */
const hmac = async (m: Uint8Array<ArrayBuffer>, k: Uint8Array<ArrayBuffer>) => {
    const baseKey = await crypto.subtle.importKey(
        "raw",
        k,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );

    const buffer = await crypto.subtle.sign('HMAC', baseKey, m);
    return new Uint8Array(buffer);
};


/**
 * Generate a 256-bit PBKDF2 Master Key from the user"s email and master password.
 * @param {string} email
 * @param {string} masterPassword
 * @returns {Promise<Uint8Array<ArrayBuffer>>} 256-bit PBKDF2 Master Key in hex.
 */
export const generateMasterKey = async (email: string, masterPassword: string) => {
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
        { name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: 720000, },
        baseKey,
        256, // The length of the derived bits (256-bit).
    );

    return new Uint8Array(buffer);
};


/**
 * Generate a 512-bit stretched symmetric key using HKDF from the user's master key.
 * @param {Uint8Array<ArrayBuffer>} masterKey
 * @returns {Promise<StretchedMasterKey>} StretchedMasterKey.
 */
export const generateStretchedMasterKey = async (masterKey: Uint8Array<ArrayBuffer>) => {
    const encoder = new TextEncoder();

    const algorithm = {
        name: "HKDF",
        hash: "SHA-512",
        salt: encoder.encode(""), // Salt is not necessary, we can rely on info.
        info: encoder.encode("For encryption and decryption of protected symmetric key."),
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


/**
 * Generate a protected symmetric key instance.
 * Compose of 256-bit encrypted symmetric key, 256-bit MAC, and 128-bit IV.
 * @param {StretchedMasterKey} smk
 * @returns {Promise<ProtectedSymmetricKey>} ProtectedSymmetricKey.
 */
export const generateProtectedSymmetricKey = async (smk: StretchedMasterKey) => {
    // Create random 512-bit Symmetric Key and 128-bit IV.
    const skey = crypto.getRandomValues(new Uint8Array(64));
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const baseSmk = await crypto.subtle.importKey(
        "raw",
        smk.ekey,
        { name: "AES-GCM" },
        false,
        ["encrypt"],
    );

    const epskBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        baseSmk,
        skey
    );

    // Create MAC for PSK.
    const psk = new Uint8Array(epskBuffer);
    const mac = await hmac(psk, smk.mkey);

    // Append mac and iv to the psk to form a 640-bit key.
    const pskBuffer = new Uint8Array([...psk, ...mac, ...iv])

    return new ProtectedSymmetricKey(pskBuffer);
};


/**
 * Generate a 256-bit Login Hash using PBKDF2 method from the user"s
 * master password and master key.
 * @param {Uint8Array<ArrayBuffer>} masterKey
 * @param {string} masterPassword
 * @returns {Promise<Uint8Array<ArrayBuffer>>} The hexadecimal representation of the 256-bit Login Hash.
 */
export const generateLoginhash = async (masterKey: Uint8Array<ArrayBuffer>, masterPassword: string) => {
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


/**
 * Encrypt the 128-bit Cipher Key using AES-GCM with the SMK, PSK, and PSKIV.
 * @param {string} smk Stretched Master Key
 * @param {string} psk Protected Symmetric Key
 * @param {string} pskIv Protected Symmetric Key IV
 * @param {Uint8Array<ArrayBuffer>} cipherKey
 * @returns {Promise<string>} A base64 representation of the encrypted cipher key.
 */
export const encryptCipherKey = async (smk: string, psk: string, pskIV: string, cipherKey: Uint8Array<ArrayBuffer>) => {
    const sk = await decryptProtectedSymmetricKey(smk, psk, pskIV);

    const encKey = await crypto.subtle.importKey(
        "raw",
        sk,
        { name: "AES-GCM" },
        false,
        ["encrypt"],
    );

    const randomIV = crypto.getRandomValues(new Uint8Array(16));

    const data = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: randomIV },
        encKey,
        cipherKey
    );

    return btoa(JSON.stringify({
        key: arrayBufferToHex(data),
        iv: arrayBufferToHex(randomIV),
    }));
};


/**
 * Encrypt the data using AES-GCM with a 128-bit Cipher Key and a random IV.
 * @param {Uint8Array<ArrayBuffer>} cipherKey
 * @param {string} data
 * @returns {Promise<string>} The base64 representation of the object containing hex of
 * encrypted data and the iv. 
 */
export const encryptText = async (cipherKey: Uint8Array<ArrayBuffer>, data: string) => {
    const encoder = new TextEncoder();
    const encKey = await crypto.subtle.importKey(
        "raw",
        cipherKey,
        { name: "AES-GCM" },
        false,
        ["encrypt"],
    );

    const randomIV = crypto.getRandomValues(new Uint8Array(16));

    const encData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: randomIV },
        encKey,
        encoder.encode(data),
    );

    return btoa(JSON.stringify({
        data: arrayBufferToHex(encData),
        iv: arrayBufferToHex(randomIV),
    }));
};


/**
 * Decrypt the PSK using SMK and the PSK IV.
 * @param {string} smk Stretched Master Key.
 * @param {string} psk Protected Symmetric Key.
 * @param {string} pskIV The PSK IV.
 * @returns {Promise<Uint8Array<ArrayBuffer>>}} The decrypted symmetric key.
 */
const decryptProtectedSymmetricKey = async (smk: string, psk: string, pskIV: string) => {
    const encKey = await crypto.subtle.importKey(
        "raw",
        hexToArrayBuffer(smk),
        { name: "AES-GCM" },
        false,
        ["decrypt"],
    );
    const data = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: hexToArrayBuffer(pskIV) },
        encKey,
        hexToArrayBuffer(psk),
    );

    return new Uint8Array(data);
};
