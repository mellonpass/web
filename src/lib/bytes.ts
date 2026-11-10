/**
 * Convert ArrayBuffer into base64 encoded string.
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {string} A base64 representation of the buffer.
 */
export const arrayBufferToBase64 = (buffer: ArrayBuffer | Uint8Array) => {
  if (buffer instanceof ArrayBuffer) {
    buffer = new Uint8Array(buffer);
  }
  let binaryString = "";
  const chunkSize = 0x8000; // Max chunk size to avoid stack overflow.

  for (let i = 0; i < buffer.length; i += chunkSize) {
    // Convert Uint8Array to a regular array slice before applying
    const chunk = Array.from(buffer.slice(i, i + chunkSize));
    binaryString += String.fromCharCode.apply(null, chunk);
  }

  return btoa(binaryString);
};

/**
 * Normalizes standard and URL-safe base64 strings with required padding.
 * @param {string} base64
 * @returns {string} Normalized base64 string.
 */
export const normalizeBase64 = (base64: string): string => {
  let normalized = base64.trim().replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  if (pad) {
    normalized += "=".repeat(4 - pad);
  }
  return normalized;
};

/**
 * Convert base64 string into Uint8Array.
 * Supports standard base64 and URL-safe base64 strings.
 * @param {string} base64
 * @returns {Uint8Array} Uint8Array.
 */
export const base64ToArrayBuffer = (base64: string) => {
  // Decode the Base64 string into a binary string
  const binaryString = atob(normalizeBase64(base64));

  // Create a Uint8Array with the same length as the binary string
  const uint8Array = new Uint8Array(binaryString.length);

  // Loop through the binary string and convert each character to a byte
  for (let i = 0; i < binaryString.length; i++) {
    uint8Array[i] = binaryString.charCodeAt(i);
  }

  return uint8Array;
};
