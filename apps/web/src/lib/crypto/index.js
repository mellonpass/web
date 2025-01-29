/**
 * Convert ArrayBuffer into hexadecimal string.
 * @param {ArrayBuffer} buffer
 * @returns {string} A hexadecimal representation of the buffer.
 */
const arrayBufferToHex = (buffer) => {
    return Array.from(new Uint8Array(buffer))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
};


/**
 * Convert hexadecimal string into ArrayBuffer.
 * @param {string} hex
 * @returns {ArrayBuffer} ArrayBuffer representation of the hexadecimal string.
 */
const hexToArrayBuffer = (hex) => {
    return new Uint8Array(hex.match(/../g)
        .map(h => parseInt(h, 16))).buffer
};


/**
 * Generate a 256-bit PBKDF2 Master Key from the user's email and master password.
 * @param {string} email
 * @param {string} masterPassword
 * @returns {string} 256-bit PBKDF2 Master Key.
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
 * Generate a 512-bit HKDF Stretched Master Key from the user's Master Key.
 * @param {string} masterKey
 * @returns {string} 512-bit HKDF Stretched Master Key.
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
        { name: 'AES-GCM', length: 256 },  // Output is used for 256-bit AES key.
        baseKey,
        256, // The length of the derived bits (256-bit).
    );

    return arrayBufferToHex(buffer);
};


/**
 * Generate an encrypted secure random 512-bit Symmetric Key and 128-bit IV.
 * @param {string} stretchedMasterKey
 * @returns {Object} Object containing an encrypted 512-bit Symmetric Key and 128-bit IV.
 */
export const generateProtectedSymmetricKey = async (stretchedMasterKey) => {
    const encoder = new TextEncoder();
    const randomSK = crypto.getRandomValues(new Uint8Array(64));
    const randomIV = crypto.getRandomValues(new Uint8Array(16));

    const baseKey = await crypto.subtle.importKey(
        "raw",
        hexToArrayBuffer(stretchedMasterKey),
        "HKDF",
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
        iv: arrayBufferToHex(randomIV.buffer),
    };
};


/**
 * Generate a 256-bit login hash using PBKDF2 method from the user's master password and master key.
 * @param {string} masterKey
 * @param {string} masterPassword
 * @param {string} loginHash
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
