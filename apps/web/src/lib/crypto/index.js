/**
 * Generates two PBKDF2 master keys from the user's email and master password.
 *  - The PBKDF2 master key to generate a HFKD key.
 *  - The PBKDF2 master ket to generate a login hash.
 * @param {string} email - The verified email of the user.
 * @param {string} masterPassword - The master password in plain text.
 * @returns {Object} - The PBKDF2 and the HKDF master keys.
 */
export const generateMasterKey = async (email, masterPassword) => {
    const encoder = new TextEncoder();
    const salt = encoder.encode(email);

    const algorithm = {
        name: "PBKDF2",
        hash: "SHA-256",
        salt: salt,
        iterations: 720000,
    };
    const baseKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(masterPassword),
        "PBKDF2",
        false,
        ["deriveBits"],
    );
    const derivedBits = await crypto.subtle.deriveBits(algorithm, baseKey, 256)

    const pbkdf2ForLoginHash = await crypto.subtle.importKey("raw", derivedBits, "PBKDF2", false, ["deriveKey"]);
    const pbkdf2ForHKDF = await crypto.subtle.importKey("raw", derivedBits, "HKDF", false, ["deriveKey"]);

    return {
        masterKeyForLoginHash: pbkdf2ForLoginHash,
        masterKeyForHKDF: pbkdf2ForHKDF,
    }
};