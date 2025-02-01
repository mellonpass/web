/**
 * Convert ArrayBuffer into hexadecimal string.
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {string} A hex representation of the buffer.
 */
export const arrayBufferToHex = (buffer) => {
    if (buffer instanceof ArrayBuffer) {
        buffer = new Uint8Array(buffer);
    }
    return Array.from(buffer)
        .map(byte => byte.toString(16).padStart(2, "0"))
        .join("");
};


/**
 * Convert hex string into ArrayBuffer.
 * @param {string} hex
 * @returns {Uint8Array<ArrayBuffer>} Uint8Array<ArrayBuffer>.
 */
export const hexToArrayBuffer = (hex) => {
    return new Uint8Array(hex.match(/../g)
        .map(h => parseInt(h, 16))).buffer
};
