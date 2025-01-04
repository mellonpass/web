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

    return await crypto.subtle.importKey("raw", derivedBits, "HKDF", false, ["deriveKey"]);
};