import { afterEach, describe, expect, it } from "vitest";
import {
  extractCipherKey,
  extractSymmetricKey,
  generateCipherKey,
  generateOrganizationSymmetricKey,
  generateProtectedSymmetricKey,
  generateStretchedMasterKey,
} from "$lib/key-generation";
import { organizationStore } from "$lib/stores";
import {
  decryptCipherForVaultContent,
  decryptCipherForVaultItem,
  encryptCipher,
} from "$lib/symmetric-encryption";
import {
  CipherType,
  VaultStatus,
  type CipherCardData,
  type CipherDatabaseData,
  type CipherLoginData,
  type CipherSecuresNoteData,
} from "$lib/types";
import { encryptVaultDetailForUpdate } from "$lib/vaults";
import { arrayBufferToBase64 } from "$lib/bytes";

async function deriveVaultSymmetricKey() {
  const rawMk = new Uint8Array(32);
  for (let i = 0; i < rawMk.length; i++) {
    rawMk[i] = (i * 13 + 5) & 0xff;
  }
  const smk = await generateStretchedMasterKey(rawMk);
  const psk = await generateProtectedSymmetricKey(smk);
  return await extractSymmetricKey(arrayBufferToBase64(rawMk), psk);
}

describe("Full key-wrapping chain (SMK -> PSK -> SK -> CK -> CipherData)", () => {
  afterEach(() => {
    organizationStore.clear();
  });

  it("encrypts and decrypts LOGIN ciphers for list view and detail view", async () => {
    const sk = await deriveVaultSymmetricKey();
    const ck = generateCipherKey();
    const loginData: CipherLoginData = {
      username: "alice@acme.io",
      password: "Tr0ub4dor&3-VaultPassword!",
      authenticatorKey: "JBSWY3DPEHPK3PXP",
      url: "https://portal.acme.io/login",
    };

    const cipher = await encryptCipher({
      sk,
      ck,
      name: "Acme Admin Portal",
      notes: "SSO fallback credentials",
      type: CipherType.LOGIN,
      status: VaultStatus.ACTIVE,
      isFavorite: true,
      data: loginData,
    });
    cipher.id = "cipher-login-1";

    // Ciphertext must not leak plaintext strings
    expect(cipher.name).not.toContain("Acme Admin Portal");
    expect(cipher.notes).not.toContain("SSO fallback credentials");
    expect((cipher.data as CipherLoginData).password).not.toContain("Tr0ub4dor");
    expect((cipher.data as CipherLoginData).username).not.toContain("alice@acme.io");

    const item = await decryptCipherForVaultItem(sk, cipher);
    expect(item.id).toBe("cipher-login-1");
    expect(item.type).toBe(CipherType.LOGIN);
    expect(item.name).toBe("Acme Admin Portal");
    expect(item.notes).toBe("SSO fallback credentials");
    expect(item.isFavorite).toBe(true);
    expect(item.status).toBe(VaultStatus.ACTIVE);
    expect(item.content).toBe("alice@acme.io");

    const detail = await decryptCipherForVaultContent<CipherLoginData>(sk, cipher);
    expect(detail.data).toEqual(loginData);

    // Optional empty authenticatorKey and url
    const minimalLoginCipher = await encryptCipher({
      sk,
      ck: generateCipherKey(),
      name: "Minimal Login",
      notes: "",
      type: CipherType.LOGIN,
      status: VaultStatus.ARCHIVED,
      isFavorite: false,
      data: {
        username: "bob",
        password: "pw",
        authenticatorKey: "",
        url: "",
      },
    });
    minimalLoginCipher.id = "cipher-login-2";
    const minimalDetail =
      await decryptCipherForVaultContent<CipherLoginData>(sk, minimalLoginCipher);
    expect(minimalDetail.data).toEqual({
      username: "bob",
      password: "pw",
      authenticatorKey: "",
      url: "",
    });
  });

  it("encrypts and decrypts CARD ciphers with masked last-4 preview formatting", async () => {
    const sk = await deriveVaultSymmetricKey();
    const ck = generateCipherKey();
    const cardData: CipherCardData = {
      cardholderName: "Alice Lovelace",
      number: "4111 1111 1111 4242",
      brand: "Visa",
      expMonth: "12",
      expYear: "2029",
      securityCode: "789",
    };

    const cipher = await encryptCipher({
      sk,
      ck,
      name: "Corporate Card",
      notes: "Travel expenses only",
      type: CipherType.CARD,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
      data: cardData,
    });
    cipher.id = "cipher-card-1";

    const item = await decryptCipherForVaultItem(sk, cipher);
    expect(item.content).toBe("Visa • •••• 4242");

    const detail = await decryptCipherForVaultContent<CipherCardData>(sk, cipher);
    expect(detail.data).toEqual(cardData);
  });

  it("encrypts and decrypts DATABASE ciphers in both URL and PARAMETERS modes", async () => {
    const sk = await deriveVaultSymmetricKey();

    const urlData: CipherDatabaseData = {
      engine: "PostgreSQL",
      connectionType: "URL",
      url: "postgresql://dbadmin:s3cr3tPass@db.internal:5432/prod",
    };
    const urlCipher = await encryptCipher({
      sk,
      ck: generateCipherKey(),
      name: "Prod DB URL",
      notes: "Primary cluster",
      type: CipherType.DATABASE,
      status: VaultStatus.ACTIVE,
      isFavorite: true,
      data: urlData,
    });
    urlCipher.id = "cipher-db-url";

    const urlItem = await decryptCipherForVaultItem(sk, urlCipher);
    expect(urlItem.content).toBe(
      "PostgreSQL • postgresql://dbadmin:••••@db.internal:5432/prod"
    );

    const urlDetail = await decryptCipherForVaultContent<CipherDatabaseData>(
      sk,
      urlCipher
    );
    expect(urlDetail.data).toEqual({
      engine: "PostgreSQL",
      connectionType: "URL",
      url: "postgresql://dbadmin:s3cr3tPass@db.internal:5432/prod",
      host: "",
      port: "",
      database: "",
      username: "",
      password: "",
    });

    const paramsData: CipherDatabaseData = {
      engine: "MySQL",
      connectionType: "PARAMETERS",
      host: "mysql.internal",
      port: "3306",
      database: "billing",
      username: "billing_ro",
      password: "readOnlyPass!",
    };
    const paramsCipher = await encryptCipher({
      sk,
      ck: generateCipherKey(),
      name: "Billing Replica",
      notes: "",
      type: CipherType.DATABASE,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
      data: paramsData,
    });
    paramsCipher.id = "cipher-db-params";

    const paramsItem = await decryptCipherForVaultItem(sk, paramsCipher);
    expect(paramsItem.content).toBe("MySQL • mysql.internal");

    const paramsDetail = await decryptCipherForVaultContent<CipherDatabaseData>(
      sk,
      paramsCipher
    );
    expect(paramsDetail.data).toEqual({
      engine: "MySQL",
      connectionType: "PARAMETERS",
      url: "",
      host: "mysql.internal",
      port: "3306",
      database: "billing",
      username: "billing_ro",
      password: "readOnlyPass!",
    });
  });

  it("encrypts and decrypts SECURE_NOTE ciphers", async () => {
    const sk = await deriveVaultSymmetricKey();
    const cipher = await encryptCipher({
      sk,
      ck: generateCipherKey(),
      name: "Recovery Seed Phrase",
      notes: "# Backup\n- keep offline",
      type: CipherType.SECURE_NOTE,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
      data: undefined,
    });
    cipher.id = "cipher-note-1";

    expect(cipher.data).toBeNull();

    const item = await decryptCipherForVaultItem(sk, cipher);
    expect(item.content).toBe("Encrypted note");
    expect(item.name).toBe("Recovery Seed Phrase");
    expect(item.notes).toBe("# Backup\n- keep offline");

    const detail = await decryptCipherForVaultContent<CipherSecuresNoteData>(
      sk,
      cipher
    );
    expect(detail.data).toBeNull();
    expect(detail.notes).toBe("# Backup\n- keep offline");
  });

  it("rotates per-item CipherKey on every update via encryptVaultDetailForUpdate()", async () => {
    const sk = await deriveVaultSymmetricKey();
    const initialCipher = await encryptCipher({
      sk,
      ck: generateCipherKey(),
      name: "GitHub Token",
      notes: "v1 notes",
      type: CipherType.LOGIN,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
      data: {
        username: "octocat",
        password: "old-password-1",
        authenticatorKey: "",
        url: "https://github.com",
      },
    });
    initialCipher.id = "cipher-rotate-1";

    const ck1 = await extractCipherKey(sk, initialCipher.key);
    const detail = await decryptCipherForVaultContent<CipherLoginData>(
      sk,
      initialCipher
    );

    detail.name = "GitHub Token (Rotated)";
    detail.data.password = "new-password-2";

    const updatedCipher = await encryptVaultDetailForUpdate({
      vaultDetail: detail,
      sk,
    });

    expect(updatedCipher.id).toBe("cipher-rotate-1");
    expect(updatedCipher.key).not.toBe(initialCipher.key);

    const ck2 = await extractCipherKey(sk, updatedCipher.key);
    expect(ck2.keybuffer).not.toEqual(ck1.keybuffer);

    // Old CipherKey cannot decrypt updated cipher fields
    await expect(ck1.decryptText(updatedCipher.name)).rejects.toThrow(
      "Invalid MAC signature!"
    );

    // SymmetricKey -> rotated CipherKey decrypts updated values cleanly
    const updatedDetail = await decryptCipherForVaultContent<CipherLoginData>(
      sk,
      updatedCipher
    );
    expect(updatedDetail.name).toBe("GitHub Token (Rotated)");
    expect(updatedDetail.data.password).toBe("new-password-2");
  });

  it("wraps rotated CipherKey under OSK for organization-scoped items", async () => {
    const personalSk = await deriveVaultSymmetricKey();
    const orgId = "org-uuid-1";
    const osk = generateOrganizationSymmetricKey();
    organizationStore.setDecryptedKey(orgId, osk);

    const orgCipher = await encryptCipher({
      sk: osk,
      ck: generateCipherKey(),
      name: "Shared Prod API Key",
      notes: "Team secret",
      type: CipherType.SECURE_NOTE,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
    });
    orgCipher.id = "org-cipher-1";
    orgCipher.organizationId = orgId;

    const orgDetail = await decryptCipherForVaultContent<CipherSecuresNoteData>(
      osk,
      orgCipher
    );
    orgDetail.notes = "Team secret v2";

    const updatedOrgCipher = await encryptVaultDetailForUpdate({
      vaultDetail: orgDetail,
      sk: personalSk,
    });

    expect(updatedOrgCipher.key).not.toBe(orgCipher.key);
    await expect(extractCipherKey(personalSk, updatedOrgCipher.key)).rejects.toThrow(
      "Invalid MAC signature!"
    );

    const decryptedByOsk =
      await decryptCipherForVaultContent<CipherSecuresNoteData>(
        osk,
        updatedOrgCipher
      );
    expect(decryptedByOsk.notes).toBe("Team secret v2");
  });
});
