import { arrayBufferToHex, hexToArrayBuffer } from "$lib/utils/bytes";


export class StretchedMasterKey {
    ekey;
    mkey;

    /**
     * StretchedMasterKey
     * @param {Uint8Array<ArrayBuffer>} key Buffer of the stretched master key.
     */
    constructor(key) {
        // Slice stretchedMasterKey into two 256-bit for encryption and hmac. 
        this.ekey = key.slice(0, 32);
        this.mkey = key.slice(32, 64);
    }
}


export class ProtectedSymmetricKey {
    #key;
    pskey;
    mac;
    iv;

    /**
     * 
     * @param {Uint8Array<ArrayBuffer>} key The Buffer of protected symmetric key.
     */
    constructor(key) {
        this.#key = key;
        this.pskey = this.#key.slice(0, 32);
        this.mac = this.#key.slice(32, 64);
        this.iv = this.#key.slice(64, 16);
    }

    toBase64() {
        return btoa(arrayBufferToHex(this.#key));
    }

    /**
     * Convert base64 encoded string into protected symmetric key instance.
     * @param {string} encodedKey Protected symmetric key in base64 format.
     * @returns {ProtectedSymmetricKey}
     */
    static fromBase64(encodedKey) {
        return new ProtectedSymmetricKey(hexToArrayBuffer(atob(encodedKey)));
    }
}
