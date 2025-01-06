const arrayBytesToHex = (bytes) => {
    return Array.from(new Uint8Array(bytes))
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
};


/**
 * Generate a 256-bit master key using PBKDF2 from the user's email and master password.
 * @param {string} email - The verified email of the user.
 * @param {string} masterPassword - The master password in plain text.
 * @returns {string} - The master key.
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
    const derivedBits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", hash: "SHA-256", salt: salt, iterations: 720000, },
        baseKey,
        256 // The length of the derived bits (256-bit).
    );

    return arrayBytesToHex(derivedBits);
};


/**
 * Generate a 256-bit login hash using PBKDF2 method from the user's master password and master key.
 * @param {string} masterKey - The user's master key.
 * @param {string} masterPassword - The master password in plain text.
 * @param {string} loginHash - The user's login hash.
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
        encoder.encode(masterKey),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const derivedBits = await crypto.subtle.deriveBits(algorithm, baseKey, 256)

    return arrayBytesToHex(derivedBits);
};


/**
 * Generate a stretched master key from the user's master key using a 512-bit
 * HKDF method.
 * @param {string} masterKey - The master key.
 * @returns {string} - The stretched master key.
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
        encoder.encode(masterKey),
        "HKDF",
        false,
        ["deriveBits"],
    );



/**
 * Generate a secured random 512-bit symmetric key and 128-bit IV and encrypt the
 * symmetric key using 512-bit Stretched Master Key.
 * @param {CryptoKey} stretchedMasterKey - The 512-bit stretched master key.
 * @returns {string} - The protected symmetric key in string format.
 */
export const generateProtectedSymmetricKey = async (stretchedMasterKey) => {
    const encoder = new TextEncoder();
    const randomSK = crypto.getRandomValues(new Uint8Array(64));
    const randomIV = crypto.getRandomValues(new Uint8Array(16));

    const pSKBytes = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: randomIV },
        stretchedMasterKey,
        randomSK
    );
    return arrayBytesToHex(pSKBytes);
};