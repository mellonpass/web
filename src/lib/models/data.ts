export class ProtectedData {
  data: Uint8Array<ArrayBuffer>;
  mac: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;

  constructor(databuffer: Uint8Array<ArrayBuffer>) {
    const IV_START_LEN = databuffer.length - 16;
    const MAC_START_LEN = IV_START_LEN - 32;

    this.iv = databuffer.slice(IV_START_LEN, databuffer.byteLength);
    this.mac = databuffer.slice(MAC_START_LEN, IV_START_LEN);
    this.data = databuffer.slice(0, MAC_START_LEN);
  }
}
