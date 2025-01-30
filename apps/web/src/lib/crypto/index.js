/**
 * Convert ArrayBuffer into hexadecimal string.
 * @param {{ArrayBuffer|Uint8Array}} buffer
 * @returns {string} A hex representation of the buffer.
 */
const arrayBufferToHex = (buffer) => {
    if (buffer instanceof ArrayBuffer) {
        buffer = new Uint8Array(buffer);
    }
    return Array.from(buffer)
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
};


/**
 * Convert hex string into ArrayBuffer.
 * @param {string} hex
 * @returns {ArrayBuffer} ArrayBuffer representation of the hex.
 */
const hexToArrayBuffer = (hex) => {
    return new Uint8Array(hex.match(/../g)
        .map(h => parseInt(h, 16))).buffer
};


/**
 * Generate a 256-bit PBKDF2 Master Key from the user's email and master password.
 * @param {string} email
 * @param {string} masterPassword
 * @returns {string} 256-bit PBKDF2 Master Key in hex.
 */
export const generateMasterKey = async (email, masterPassword) => {
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

    return arrayBufferToHex(buffer);
};


/**
 * Generate a 256-bit Stretched Master Key using 512-bit HKDF from the user's Master Key.
 * @param {string} masterKey
 * @returns {string} 256-bit Stretched Master Key in hex.
 */
export const generateStretchedMasterKey = async (masterKey) => {
    const encoder = new TextEncoder();

    const algorithm = {
        name: "HKDF",
        hash: "SHA-512",
        salt: encoder.encode(""), // Salt is not necessary, we can rely on info.
        info: encoder.encode("For encryption and decryption of protected key."),
    };

    const baseKey = await crypto.subtle.importKey(
        "raw",
        hexToArrayBuffer(masterKey),
        "HKDF",
        false,
        ["deriveBits"],
    );

    const buffer = await crypto.subtle.deriveBits(
        algorithm,
        baseKey,
        256, // The length of the derived bits (256-bit).
    );

    return arrayBufferToHex(buffer);
};


/**
 * Generate an encrypted secure random 256-bit Symmetric Key and 128-bit IV.
 * @param {string} stretchedMasterKey
 * @returns {Object} Object containing hex of an encrypted 256-bit Symmetric Key
 * and 128-bit IV.
 */
export const generateProtectedSymmetricKey = async (stretchedMasterKey) => {
    const encoder = new TextEncoder();
    const randomSK = crypto.getRandomValues(new Uint8Array(32));
    const randomIV = crypto.getRandomValues(new Uint8Array(16));

    const baseKey = await crypto.subtle.importKey(
        "raw",
        hexToArrayBuffer(stretchedMasterKey),
        { name: "AES-GCM" },
        false,
        ["encrypt"],
    );

    const pSKBytes = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: randomIV },
        baseKey,
        randomSK
    );

    return {
        key: arrayBufferToHex(pSKBytes),
        // TODO: Find away how to rotate the IV.
        iv: arrayBufferToHex(randomIV),
    };
};


/**
 * Generate a 256-bit Login Hash using PBKDF2 method from the user's
 * master password and master key.
 * @param {string} masterKey
 * @param {string} masterPassword
 * @param {string} loginHash
 * @returns {string} The hexadecimal representation of the 256-bit Login Hash.
 */
export const generateLoginhash = async (masterKey, masterPassword) => {
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
        hexToArrayBuffer(masterKey),
        "PBKDF2",
        false,
        ["deriveBits"],
    );

    const derivedBits = await crypto.subtle.deriveBits(algorithm, baseKey, 256);
    return arrayBufferToHex(derivedBits);
};


/**
 * Encrypt the 128-bit Cipher Key using AES-GCM with the SMK, PSK, and PSKIV.
 * @param {string} smk Stretched Master Key
 * @param {string} psk Protected Symmetric Key
 * @param {string} pskIv Protected Symmetric Key IV
 * @param {Uint8Array<ArrayBuffer>} cipherKey
 * @returns {string} A base64 representation of the encrypted cipher key.
 */
export const encryptCipherKey = async (smk, psk, pskIV, cipherKey) => {
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
 * @param {Uint8Array<ArrayBuffer>} 
 * @param {*} data
 * @returns {string} The base64 representation of the object containing hex of
 * encrypted data and the iv. 
 */
export const encryptText = async (cipherKey, data) => {
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
 * @returns {Uint8Array<ArrayBuffer>} The decrypted symmetric key.
 */
const decryptProtectedSymmetricKey = async (smk, psk, pskIV) => {
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
