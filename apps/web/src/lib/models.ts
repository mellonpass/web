import { arrayBufferToHex, hexToArrayBuffer } from "$lib/utils/bytes";


interface IKey {
    keybuffer: Uint8Array<ArrayBuffer>;
};

abstract class KeyMixin implements IKey {
    keybuffer: Uint8Array<ArrayBuffer>;

    constructor(keybuffer: Uint8Array<ArrayBuffer>) {
        this.keybuffer = keybuffer;
    }

    toBase64() {
        return btoa(arrayBufferToHex(this.keybuffer));
    }

    static fromBase64<T extends KeyMixin>(this: new (encodedKey: any) => T, encodedKey: any): T {
        return new this(hexToArrayBuffer(atob(encodedKey)));
    }

}

abstract class Key extends KeyMixin {
    private aeskeyBuffer: Uint8Array<ArrayBuffer>;
    private mackeyBuffer: Uint8Array<ArrayBuffer>;

    constructor(keybuffer: Uint8Array<ArrayBuffer>) {
        super(keybuffer);
        this.aeskeyBuffer = keybuffer.slice(0, 32);
        this.mackeyBuffer = keybuffer.slice(32, 64);
    }

    async getMACKey(): Promise<CryptoKey> {
        return await crypto.subtle.importKey(
            "raw",
            this.mackeyBuffer,
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["sign", "verify"]
        );
    }

    async getAESKey(): Promise<CryptoKey> {
        return await crypto.subtle.importKey(
            "raw",
            this.aeskeyBuffer,
            { name: "AES-GCM" },
            false,
            ["encrypt", "decrypt"],
        );
    };

    async hmacSignKey(key: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
        const macKey = await this.getMACKey();
        const buffer = await crypto.subtle.sign("HMAC", macKey, key);
        return new Uint8Array(buffer);
    }

    async hmacVerifyKey(signature: Uint8Array<ArrayBuffer>, data: Uint8Array<ArrayBuffer>): Promise<boolean> {
        const macKey = await this.getMACKey();
        return await crypto.subtle.verify(
            "HMAC",
            macKey,
            signature,
            data
        );
    }

};


export class StretchedMasterKey extends Key {
    constructor(keybuffer: Uint8Array<ArrayBuffer>) {
        super(keybuffer);
    }
}


export class SymmetricKey extends Key {
    constructor(keybuffer: Uint8Array<ArrayBuffer>) {
        super(keybuffer);
    }
}


export class CipherKey extends Key {
    constructor(keybuffer: Uint8Array<ArrayBuffer>) {
        super(keybuffer);
    }
}


abstract class ProtectedKey extends KeyMixin {
    private pkey: Uint8Array<ArrayBuffer>;
    private mac: Uint8Array<ArrayBuffer>;
    private iv: Uint8Array<ArrayBuffer>;

    constructor(keybuffer: Uint8Array<ArrayBuffer>) {
        super(keybuffer);
        this.pkey = keybuffer.slice(0, 64);
        this.mac = keybuffer.slice(64, 128);
        this.iv = keybuffer.slice(128, 16);
    }

    async decrypt(sk: Key): Promise<Key> {
        const result = await sk.hmacVerifyKey(this.mac, this.pkey);
        if (result) {
            const baseKey = await sk.getAESKey();
            // Decrypted symmetric key.
            const buffer = await crypto.subtle.decrypt(
                { name: "AES-GCM", iv: this.iv },
                baseKey,
                this.pkey,
            );
            return new SymmetricKey(new Uint8Array(buffer));
        }
        throw new Error("Invalid MAC signature!");
    }

}


export class ProtectedSymmetricKey extends ProtectedKey {
    constructor(key: Uint8Array<ArrayBuffer>) {
        super(key);
    }
}

export class ProtectedCipherKey extends ProtectedKey {
    constructor(key: Uint8Array<ArrayBuffer>) {
        super(key);
    }
}
