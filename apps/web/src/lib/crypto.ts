import { arrayBufferToHex } from "$lib/utils/bytes";
import { CipherKey, ProtectedCipherKey, ProtectedSymmetricKey, StretchedMasterKey, SymmetricKey } from "$lib/models";


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

    const epskBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        await smk.getAESKey(),
        skey
    );

    // Create MAC for PSK.
    const psk = new Uint8Array(epskBuffer);
    const mac = await smk.hmacSignKey(psk);

    // Append mac and iv to the psk to form a 1152-bit key.
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


export const generateCipherKey = async () => {
    const ckeyBuffer = crypto.getRandomValues(new Uint8Array(64));
    return new CipherKey(ckeyBuffer);
};


/**
 * Encrypt the 128-bit Cipher Key using AES-GCM with the SMK, PSK, and PSKIV.
 * @returns {Promise<string>} A base64 representation of the encrypted cipher key.
 */
export const encryptCipherKey = async (sk: SymmetricKey, cipherKey: CipherKey) => {
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const eckeyBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        await sk.getAESKey(),
        cipherKey.keybuffer
    );

    // Create MAC for PSK.
    const ck = new Uint8Array(eckeyBuffer);
    const mac = await sk.hmacSignKey(ck);

    // Append mac and iv to the psk to form a 1152-bit key.
    const pckBuffer = new Uint8Array([...ck, ...mac, ...iv])
    return new ProtectedCipherKey(pckBuffer);
};


/**
 * Encrypt the data using AES-GCM with a 128-bit Cipher Key and a random IV.
 * @param {Uint8Array<ArrayBuffer>} cipherKey
 * @param {string} data
 * @returns {Promise<string>} The base64 representation of the object containing hex of
 * encrypted data and the iv. 
 */
export const encryptText = async (cipherKey: CipherKey, text: string) => {
    const encoder = new TextEncoder();
    const randomIV = crypto.getRandomValues(new Uint8Array(16));

    const encData = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: randomIV },
        await cipherKey.getAESKey(),
        encoder.encode(text),
    );

    return btoa(JSON.stringify({
        data: arrayBufferToHex(encData),
        iv: arrayBufferToHex(randomIV),
    }));
};
