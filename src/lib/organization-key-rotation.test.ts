import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { arrayBufferToBase64 } from "$lib/bytes";
import * as cryptoClient from "$lib/crypto-client";
import {
  GET_ORGANIZATION,
  GET_ORGANIZATIONS,
  REVOKE_MEMBER,
} from "$lib/gql/organizations/schema";
import {
  decryptOrgKeyWithPrivateKey,
  decryptPrivateKeyWithSymmetricKey,
  encryptOrgKeyWithPublicKey,
  encryptRSAPrivateKey,
  extractCipherKey,
  generateCipherKey,
  generateOrganizationSymmetricKey,
  generateRSAOAEPKeyPair,
  rewrapCipherKey,
} from "$lib/key-generation";
import { SymmetricKey } from "$lib/models/keys";
import {
  createCipher,
  restoreCipherFromDelete,
  updateCipher,
  updateCipherToDelete,
} from "$lib/services/ciphers";
import {
  confirmOrganizationMember,
  prepareMemberRevocationRotation,
  revokeMemberWithRotation,
  revokeOrganizationMember,
  syncOrganizationAndKey,
} from "$lib/services/organizations";
import {
  cipherStore,
  organizationStore,
  unlockedOrgKeysStore,
} from "$lib/stores";
import {
  decryptCipherForVaultContent,
  encryptCipher,
} from "$lib/symmetric-encryption";
import {
  CipherType,
  OrganizationMemberRole,
  OrganizationMemberStatus,
  VaultStatus,
  type Cipher,
  type CipherCardData,
  type CipherLoginData,
  type CipherSecuresNoteData,
  type OrganizationMember,
} from "$lib/types";

interface TestUserCrypto {
  memberId: string;
  email: string;
  role: OrganizationMemberRole;
  publicJwk: JsonWebKey;
  privateKey: CryptoKey;
}

async function createTestUser(
  memberId: string,
  email: string,
  role: OrganizationMemberRole
): Promise<TestUserCrypto> {
  const [privateJwk, publicJwk] = await generateRSAOAEPKeyPair();
  const sk = new SymmetricKey(crypto.getRandomValues(new Uint8Array(64)));
  const protectedPrivate = await encryptRSAPrivateKey(sk, privateJwk);
  const privateKey = await decryptPrivateKeyWithSymmetricKey(
    sk,
    protectedPrivate
  );
  return {
    memberId,
    email,
    role,
    publicJwk,
    privateKey,
  };
}

describe("OrganizationSymmetricKey & CipherKey rotation on member revocation", () => {
  let alice: TestUserCrypto;
  let bob: TestUserCrypto;
  let carol: TestUserCrypto;

  beforeAll(async () => {
    [alice, bob, carol] = await Promise.all([
      createTestUser(
        "mem-alice",
        "alice@acme.io",
        OrganizationMemberRole.OWNER
      ),
      createTestUser("mem-bob", "bob@acme.io", OrganizationMemberRole.ADMIN),
      createTestUser(
        "mem-carol",
        "carol@acme.io",
        OrganizationMemberRole.MEMBER
      ),
    ]);
  }, 60_000);

  afterEach(() => {
    organizationStore.clear();
    cipherStore.set([]);
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("rewrapCipherKey unwraps with oldOsk and re-wraps with newOsk without re-encrypting cipher fields", async () => {
    const oldOsk = generateOrganizationSymmetricKey();
    const newOsk = generateOrganizationSymmetricKey();
    const originalCk = generateCipherKey();

    const cipher = await encryptCipher({
      sk: oldOsk,
      ck: originalCk,
      name: "Shared AWS Root",
      notes: "Rotate on offboarding",
      type: CipherType.LOGIN,
      status: VaultStatus.ACTIVE,
      isFavorite: true,
      data: {
        username: "aws-root",
        password: "super-secret-password",
        authenticatorKey: "JBSWY3DPEHPK3PXP",
        url: "https://console.aws.amazon.com",
      },
    });
    cipher.id = "cipher-aws-1";

    const rotatedKey = await rewrapCipherKey(oldOsk, newOsk, cipher.key);
    expect(rotatedKey).not.toBe(cipher.key);

    // newOsk recovers the exact same CipherKey so encrypted fields remain readable
    const extractedByNew = await extractCipherKey(newOsk, rotatedKey);
    expect(extractedByNew.keybuffer).toEqual(originalCk.keybuffer);

    const rotatedCipher: Cipher = { ...cipher, key: rotatedKey };
    const decrypted = await decryptCipherForVaultContent<CipherLoginData>(
      newOsk,
      rotatedCipher
    );
    expect(decrypted.name).toBe("Shared AWS Root");
    expect(decrypted.data.password).toBe("super-secret-password");

    // oldOsk can no longer unwrap the rotated Cipher.key
    await expect(extractCipherKey(oldOsk, rotatedKey)).rejects.toThrow(
      "Invalid MAC signature!"
    );

    // Passing wrong OSK to rewrapCipherKey fails MAC verification
    const wrongOsk = generateOrganizationSymmetricKey();
    await expect(rewrapCipherKey(wrongOsk, newOsk, cipher.key)).rejects.toThrow(
      "Invalid MAC signature!"
    );
  });

  it("rotates OSK and all cipher keys for remaining confirmed members and retires oldOsk", async () => {
    const oldOsk = generateOrganizationSymmetricKey();
    const oldOskSnapshot = new Uint8Array(oldOsk.keybuffer);
    const orgId = "T3JnYW5pemF0aW9uOm9yZy0x";
    organizationStore.setDecryptedKey(orgId, oldOsk);

    // Double-base64 format matches account-setup storage format
    const encodeDoubleBase64 = (jwk: JsonWebKey) =>
      btoa(arrayBufferToBase64(new TextEncoder().encode(JSON.stringify(jwk))));

    const members: OrganizationMember[] = [
      {
        id: alice.memberId,
        email: alice.email,
        role: alice.role,
        status: OrganizationMemberStatus.CONFIRMED,
        publicKey: encodeDoubleBase64(alice.publicJwk),
      },
      {
        id: bob.memberId,
        email: bob.email,
        role: bob.role,
        status: OrganizationMemberStatus.CONFIRMED,
        publicKey: null,
        user: {
          id: "user-bob",
          email: bob.email,
          publicKey: JSON.stringify(bob.publicJwk),
        },
      },
      {
        id: carol.memberId,
        email: carol.email,
        role: carol.role,
        status: OrganizationMemberStatus.CONFIRMED,
        publicKey: JSON.stringify(carol.publicJwk),
      },
      {
        id: "mem-dave-accepted",
        email: "dave@acme.io",
        role: OrganizationMemberRole.MEMBER,
        status: OrganizationMemberStatus.ACCEPTED,
        publicKey: null,
      },
      {
        id: "mem-eve-invited",
        email: "eve@acme.io",
        role: OrganizationMemberRole.MEMBER,
        status: OrganizationMemberStatus.INVITED,
        publicKey: null,
      },
    ];

    const loginCipher = await encryptCipher({
      sk: oldOsk,
      ck: generateCipherKey(),
      name: "Prod DB Admin",
      notes: "Use bastion",
      type: CipherType.LOGIN,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
      data: {
        username: "pgadmin",
        password: "pg-password-v1",
        authenticatorKey: "",
        url: "https://db.acme.io",
      },
    });
    loginCipher.id = "cipher-1";

    const cardCipher = await encryptCipher({
      sk: oldOsk,
      ck: generateCipherKey(),
      name: "Cloud Billing Card",
      notes: "Corporate Amex",
      type: CipherType.CARD,
      status: VaultStatus.ACTIVE,
      isFavorite: true,
      data: {
        cardholderName: "Acme Corp",
        number: "3782 822463 10005",
        brand: "Amex",
        expMonth: "09",
        expYear: "2028",
        securityCode: "1234",
      },
    });
    cardCipher.id = "cipher-2";

    const noteCipher = await encryptCipher({
      sk: oldOsk,
      ck: generateCipherKey(),
      name: "Incident Runbook",
      notes: "Secret escalation token: XYZ-999",
      type: CipherType.SECURE_NOTE,
      status: VaultStatus.ARCHIVED,
      isFavorite: false,
    });
    noteCipher.id = "cipher-3";

    const orgCiphers = [loginCipher, cardCipher, noteCipher];

    // Carol previously had oldOsk wrapped with her RSA public key
    const carolOldWrappedOsk = await encryptOrgKeyWithPublicKey(
      carol.publicJwk,
      oldOsk
    );

    const { newOsk, rotation } = await prepareMemberRevocationRotation({
      oldOsk,
      revokedMemberId: carol.memberId,
      members,
      ciphers: orgCiphers,
      expectedKeyVersion: 3,
    });

    expect(newOsk).toBeInstanceOf(SymmetricKey);
    expect(newOsk.keybuffer.byteLength).toBe(64);
    expect(newOsk.keybuffer).not.toEqual(oldOskSnapshot);
    expect(rotation.expectedKeyVersion).toBe(3);

    // Only remaining CONFIRMED members (Alice & Bob) receive newOsk
    expect(rotation.memberKeys.map((k) => k.memberId)).toEqual([
      alice.memberId,
      bob.memberId,
    ]);
    expect(rotation.cipherKeys.map((c) => c.cipherId)).toEqual([
      "cipher-1",
      "cipher-2",
      "cipher-3",
    ]);

    // Store transition: zero retired oldOsk and install newOsk
    organizationStore.setDecryptedKey(orgId, newOsk);
    expect(oldOsk.keybuffer.every((b) => b === 0)).toBe(true);
    expect(get(unlockedOrgKeysStore).get(orgId)).toBe(newOsk);

    // Remaining confirmed members unwrap newOsk with their RSA private keys
    const aliceWrapped = rotation.memberKeys.find(
      (k) => k.memberId === alice.memberId
    )!;
    const bobWrapped = rotation.memberKeys.find(
      (k) => k.memberId === bob.memberId
    )!;

    const aliceUnwrappedNewOsk = await decryptOrgKeyWithPrivateKey(
      alice.privateKey,
      aliceWrapped.protectedSymmetricKey
    );
    const bobUnwrappedNewOsk = await decryptOrgKeyWithPrivateKey(
      bob.privateKey,
      bobWrapped.protectedSymmetricKey
    );

    expect(aliceUnwrappedNewOsk.keybuffer).toEqual(newOsk.keybuffer);
    expect(bobUnwrappedNewOsk.keybuffer).toEqual(newOsk.keybuffer);

    // Remaining members decrypt every rotated cipher with newOsk
    const rotatedCiphers: Cipher[] = orgCiphers.map((c, idx) => ({
      ...c,
      key: rotation.cipherKeys[idx].key,
    }));

    const bobDecryptedLogin =
      await decryptCipherForVaultContent<CipherLoginData>(
        bobUnwrappedNewOsk,
        rotatedCiphers[0]
      );
    expect(bobDecryptedLogin.data.password).toBe("pg-password-v1");

    const aliceDecryptedCard =
      await decryptCipherForVaultContent<CipherCardData>(
        aliceUnwrappedNewOsk,
        rotatedCiphers[1]
      );
    expect(aliceDecryptedCard.data.securityCode).toBe("1234");

    const bobDecryptedNote =
      await decryptCipherForVaultContent<CipherSecuresNoteData>(
        bobUnwrappedNewOsk,
        rotatedCiphers[2]
      );
    expect(bobDecryptedNote.notes).toBe("Secret escalation token: XYZ-999");

    // Revoked Carol (still holding oldOsk from before revocation) cannot unwrap rotated ciphers
    const carolStaleOldOsk = await decryptOrgKeyWithPrivateKey(
      carol.privateKey,
      carolOldWrappedOsk
    );
    expect(carolStaleOldOsk.keybuffer).toEqual(oldOskSnapshot);

    for (const rotated of rotatedCiphers) {
      await expect(
        extractCipherKey(carolStaleOldOsk, rotated.key)
      ).rejects.toThrow("Invalid MAC signature!");
    }
  });

  it("throws and zeroes newOsk if a remaining confirmed member lacks a public key or cipher rewrap fails", async () => {
    const oldOsk = generateOrganizationSymmetricKey();
    const oldOskCopy = new Uint8Array(oldOsk.keybuffer);

    const cipher = await encryptCipher({
      sk: oldOsk,
      ck: generateCipherKey(),
      name: "API Secret",
      notes: "",
      type: CipherType.SECURE_NOTE,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
    });
    cipher.id = "cipher-valid";

    const origGetRandom = crypto.getRandomValues.bind(crypto);
    const getRandomSpy = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation((arr) => origGetRandom(arr));

    // Missing public key on remaining confirmed member
    await expect(
      prepareMemberRevocationRotation({
        oldOsk,
        revokedMemberId: carol.memberId,
        members: [
          {
            id: alice.memberId,
            email: alice.email,
            role: alice.role,
            status: OrganizationMemberStatus.CONFIRMED,
            publicKey: JSON.stringify(alice.publicJwk),
          },
          {
            id: bob.memberId,
            email: bob.email,
            role: bob.role,
            status: OrganizationMemberStatus.CONFIRMED,
            publicKey: null,
            user: { id: "user-bob", email: bob.email, publicKey: null },
          },
          {
            id: carol.memberId,
            email: carol.email,
            role: carol.role,
            status: OrganizationMemberStatus.CONFIRMED,
            publicKey: JSON.stringify(carol.publicJwk),
          },
        ],
        ciphers: [cipher],
        expectedKeyVersion: 1,
      })
    ).rejects.toThrow(
      `Cannot rotate organization key: missing RSA public key for ${bob.email}.`
    );

    // The 64-byte buffer allocated for newOsk during failed attempt was zeroed
    const missingKeyBuffers = getRandomSpy.mock.results
      .map((r) => r.value)
      .filter(
        (v): v is Uint8Array => v instanceof Uint8Array && v.byteLength === 64
      );
    expect(missingKeyBuffers).toHaveLength(1);
    expect(missingKeyBuffers[0].every((b) => b === 0)).toBe(true);
    // oldOsk remains intact
    expect(oldOsk.keybuffer).toEqual(oldOskCopy);

    // Cipher encrypted by wrong OSK causes MAC failure and zeroes newOsk
    const wrongOsk = generateOrganizationSymmetricKey();
    const foreignCipher = await encryptCipher({
      sk: wrongOsk,
      ck: generateCipherKey(),
      name: "Foreign Cipher",
      notes: "",
      type: CipherType.SECURE_NOTE,
      status: VaultStatus.ACTIVE,
      isFavorite: false,
    });
    foreignCipher.id = "cipher-foreign";

    getRandomSpy.mockClear();

    await expect(
      prepareMemberRevocationRotation({
        oldOsk,
        revokedMemberId: carol.memberId,
        members: [
          {
            id: alice.memberId,
            email: alice.email,
            role: alice.role,
            status: OrganizationMemberStatus.CONFIRMED,
            publicKey: JSON.stringify(alice.publicJwk),
          },
          {
            id: carol.memberId,
            email: carol.email,
            role: carol.role,
            status: OrganizationMemberStatus.CONFIRMED,
            publicKey: JSON.stringify(carol.publicJwk),
          },
        ],
        ciphers: [foreignCipher],
        expectedKeyVersion: 1,
      })
    ).rejects.toThrow("Invalid MAC signature!");

    const failedRunBuffers = getRandomSpy.mock.results
      .map((r) => r.value)
      .filter(
        (v): v is Uint8Array => v instanceof Uint8Array && v.byteLength === 64
      );
    expect(failedRunBuffers).toHaveLength(1);
    expect(failedRunBuffers[0].every((b) => b === 0)).toBe(true);
    expect(oldOsk.keybuffer).toEqual(oldOskCopy);
  });

  it("synchronizes unlockedOrgKeysStore across setDecryptedKey, removeDecryptedKey, setOrganizations, and clear", () => {
    const observedSizes: number[] = [];
    const unsubscribe = unlockedOrgKeysStore.subscribe((keysMap) => {
      observedSizes.push(keysMap.size);
    });

    const osk1 = generateOrganizationSymmetricKey();
    const osk2 = generateOrganizationSymmetricKey();
    const oskOther = generateOrganizationSymmetricKey();

    organizationStore.setDecryptedKey("org-1", osk1);
    expect(get(unlockedOrgKeysStore).get("org-1")).toBe(osk1);
    expect(Array.from(get(unlockedOrgKeysStore).keys())).toEqual(["org-1"]);

    organizationStore.setDecryptedKey("org-2", oskOther);
    expect(get(unlockedOrgKeysStore).size).toBe(2);

    // Replacing key zeroes retired buffer and updates unlockedOrgKeysStore
    organizationStore.setDecryptedKey("org-1", osk2);
    expect(osk1.keybuffer.every((b) => b === 0)).toBe(true);
    expect(get(unlockedOrgKeysStore).get("org-1")).toBe(osk2);

    // Removing org-1 zeroes osk2 and updates unlockedOrgKeysStore
    organizationStore.removeDecryptedKey("org-1");
    expect(osk2.keybuffer.every((b) => b === 0)).toBe(true);
    expect(get(unlockedOrgKeysStore).has("org-1")).toBe(false);
    expect(get(unlockedOrgKeysStore).get("org-2")).toBe(oskOther);

    // setOrganizations dropping org-2 zeroes oskOther and removes it
    organizationStore.setOrganizations([]);
    expect(oskOther.keybuffer.every((b) => b === 0)).toBe(true);
    expect(get(unlockedOrgKeysStore).size).toBe(0);

    // Re-add and clear()
    const osk3 = generateOrganizationSymmetricKey();
    organizationStore.setDecryptedKey("org-3", osk3);
    expect(get(unlockedOrgKeysStore).get("org-3")).toBe(osk3);

    organizationStore.clear();
    expect(osk3.keybuffer.every((b) => b === 0)).toBe(true);
    expect(get(unlockedOrgKeysStore).size).toBe(0);
    expect(observedSizes.length).toBeGreaterThanOrEqual(6);

    unsubscribe();
  });

  it("includes keyVersion in organization queries and formats revokeOrganizationMember rotation input", async () => {
    expect(GET_ORGANIZATIONS).toContain("keyVersion");
    expect(GET_ORGANIZATION).toContain("keyVersion");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          organization: {
            revokeMember: {
              __typename: "OrganizationMember",
              id: "mem-carol",
              email: "carol@acme.io",
              role: "MEMBER",
              status: "REVOKED",
              publicKey: null,
              created: "2026-01-01T00:00:00Z",
              updated: "2026-01-02T00:00:00Z",
              user: null,
            },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const rotationPayload = {
      expectedKeyVersion: 2,
      memberKeys: [
        { memberId: "mem-alice", protectedSymmetricKey: "enc-osk-alice" },
        { memberId: "mem-bob", protectedSymmetricKey: "enc-osk-bob" },
      ],
      cipherKeys: [{ cipherId: "cipher-1", key: "rewrapped-ck-1" }],
    };

    const result = await revokeOrganizationMember("mem-carol", rotationPayload);
    expect(result.status).toBe(OrganizationMemberStatus.REVOKED);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    const parsedBody = JSON.parse(requestInit.body as string);
    expect(parsedBody.query).toBe(REVOKE_MEMBER);
    expect(parsedBody.variables).toEqual({
      input: {
        memberId: "mem-carol",
        expectedKeyVersion: 2,
        memberKeys: rotationPayload.memberKeys,
        cipherKeys: rotationPayload.cipherKeys,
      },
    });

    // Without rotation argument, only memberId is included
    fetchMock.mockClear();
    await revokeOrganizationMember("mem-carol");
    const [, simpleInit] = fetchMock.mock.calls[0];
    const parsedSimple = JSON.parse(simpleInit.body as string);
    expect(parsedSimple.variables).toEqual({
      input: {
        memberId: "mem-carol",
      },
    });

    // Server version conflict surfaces OrganizationMutateFailed message
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          organization: {
            revokeMember: {
              __typename: "OrganizationMutateFailed",
              message:
                "Organization key version mismatch. Please refresh and try again.",
            },
          },
        },
      }),
    });

    await expect(
      revokeOrganizationMember("mem-carol", rotationPayload)
    ).rejects.toThrow(
      "Organization key version mismatch. Please refresh and try again."
    );
  });

  it("propagates expectedKeyVersion on org cipher mutations (including raw UUID organizationId) and confirmOrganizationMember", async () => {
    const rawOrgUuid = "11111111-2222-3333-4444-555555555555";
    const orgGlobalId = btoa(`Organization:${rawOrgUuid}`);
    organizationStore.setOrganizations([
      {
        id: orgGlobalId,
        name: "Acme",
        keyVersion: 4,
      },
    ]);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          cipher: {
            create: { __typename: "Cipher", id: "cipher-new" },
            update: { __typename: "Cipher", id: "cipher-1" },
            updateToDelete: { __typename: "Cipher", id: "cipher-1" },
            restoreCipherFromDelete: { __typename: "Cipher", id: "cipher-1" },
          },
          organization: {
            confirmMember: {
              __typename: "OrganizationMember",
              id: "mem-dave",
              email: "dave@acme.io",
              role: "MEMBER",
              status: "CONFIRMED",
            },
          },
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const serverShapedOrgCipher: Cipher = {
      id: "cipher-1",
      type: CipherType.LOGIN,
      key: "enc-ck",
      name: "enc-name",
      notes: "",
      isFavorite: "false",
      status: VaultStatus.ACTIVE,
      organizationId: rawOrgUuid,
      organization: { id: orgGlobalId, name: "Acme" },
      data: { username: "u", password: "p", authenticatorKey: "", url: "" },
    };

    await updateCipher(serverShapedOrgCipher);
    await updateCipherToDelete(serverShapedOrgCipher);
    await restoreCipherFromDelete(serverShapedOrgCipher);

    // Raw UUID alone (even if organization object is absent) also resolves via findOrganizationById
    await updateCipher({
      ...serverShapedOrgCipher,
      organization: null,
    });

    // createVaultItem sets organizationId to the Relay GlobalID
    await createCipher({
      ...serverShapedOrgCipher,
      id: undefined,
      organization: undefined,
      organizationId: orgGlobalId,
    });

    for (const call of fetchMock.mock.calls) {
      const parsed = JSON.parse(call[1].body as string);
      expect(parsed.variables.input.expectedKeyVersion).toBe(4);
    }

    // Personal cipher omits expectedKeyVersion
    fetchMock.mockClear();
    await updateCipher({
      ...serverShapedOrgCipher,
      organization: null,
      organizationId: null,
    });
    const personalVars = JSON.parse(fetchMock.mock.calls[0][1].body as string)
      .variables.input;
    expect("expectedKeyVersion" in personalVars).toBe(false);

    // confirmOrganizationMember sends expectedKeyVersion when provided and omits when undefined
    fetchMock.mockClear();
    await confirmOrganizationMember("mem-dave", "enc-osk-dave", 4);
    expect(
      JSON.parse(fetchMock.mock.calls[0][1].body as string).variables.input
    ).toEqual({
      memberId: "mem-dave",
      protectedSymmetricKey: "enc-osk-dave",
      expectedKeyVersion: 4,
    });

    await confirmOrganizationMember("mem-dave", "enc-osk-dave");
    const confirmWithoutVersion = JSON.parse(
      fetchMock.mock.calls[1][1].body as string
    ).variables.input;
    expect("expectedKeyVersion" in confirmWithoutVersion).toBe(false);
  });

  it("syncOrganizationAndKey refreshes stale keyVersion and OSK and zeroes retired buffer", async () => {
    const orgId = btoa("Organization:22222222-2222-2222-2222-222222222222");
    const v1Osk = generateOrganizationSymmetricKey();
    const v2Osk = generateOrganizationSymmetricKey();
    const v1Protected = await encryptOrgKeyWithPublicKey(
      alice.publicJwk,
      v1Osk
    );
    const v2Protected = await encryptOrgKeyWithPublicKey(
      alice.publicJwk,
      v2Osk
    );

    const staleOrg = {
      id: orgId,
      name: "Acme",
      keyVersion: 1,
      currentUserMembership: {
        id: alice.memberId,
        email: alice.email,
        role: alice.role,
        status: OrganizationMemberStatus.CONFIRMED,
        protectedSymmetricKey: v1Protected,
      },
    };
    organizationStore.setOrganizations([staleOrg]);
    organizationStore.setDecryptedKey(orgId, v1Osk);

    vi.spyOn(cryptoClient, "getOrAwaitUserRsaPrivateKey").mockResolvedValue(
      alice.privateKey
    );

    const freshOrg = {
      ...staleOrg,
      keyVersion: 2,
      currentUserMembership: {
        ...staleOrg.currentUserMembership,
        protectedSymmetricKey: v2Protected,
      },
    };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: { organization: freshOrg },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const synced = await syncOrganizationAndKey(staleOrg);
    expect(synced).not.toBeNull();
    expect(synced!.org.keyVersion).toBe(2);
    expect(synced!.osk.keybuffer).toEqual(v2Osk.keybuffer);
    expect(v1Osk.keybuffer.every((b) => b === 0)).toBe(true);
    expect(get(organizationStore).organizations[0].keyVersion).toBe(2);
    expect(get(unlockedOrgKeysStore).get(orgId)?.keybuffer).toEqual(
      v2Osk.keybuffer
    );
  });

  it("revokeMemberWithRotation zeroes newOsk without repopulating stores when aborted mid-mutation", async () => {
    const orgId = btoa("Organization:33333333-3333-3333-3333-333333333333");
    const oldOsk = generateOrganizationSymmetricKey();
    const oldOskProtected = await encryptOrgKeyWithPublicKey(
      alice.publicJwk,
      oldOsk
    );
    const org = {
      id: orgId,
      name: "Acme",
      keyVersion: 1,
      currentUserMembership: {
        id: alice.memberId,
        email: alice.email,
        role: alice.role,
        status: OrganizationMemberStatus.CONFIRMED,
        protectedSymmetricKey: oldOskProtected,
      },
    };
    organizationStore.setOrganizations([org]);
    organizationStore.setDecryptedKey(orgId, oldOsk);

    const origGetRandom = crypto.getRandomValues.bind(crypto);
    const getRandomSpy = vi
      .spyOn(crypto, "getRandomValues")
      .mockImplementation((arr) => origGetRandom(arr));

    let aborted = false;
    const fetchMock = vi.fn().mockImplementation(async (_url, init) => {
      const body = JSON.parse(init.body as string);
      if (body.query === GET_ORGANIZATION) {
        return {
          ok: true,
          json: async () => ({ data: { organization: org } }),
        };
      }
      if (body.query.includes("GetOrganizationMembers")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              organizationMembers: [
                {
                  id: alice.memberId,
                  email: alice.email,
                  role: alice.role,
                  status: OrganizationMemberStatus.CONFIRMED,
                  publicKey: JSON.stringify(alice.publicJwk),
                },
                {
                  id: carol.memberId,
                  email: carol.email,
                  role: carol.role,
                  status: OrganizationMemberStatus.CONFIRMED,
                  publicKey: JSON.stringify(carol.publicJwk),
                },
              ],
            },
          }),
        };
      }
      if (body.query.includes("GetGiphers")) {
        return {
          ok: true,
          json: async () => ({
            data: {
              ciphers: {
                edges: [],
                pageInfo: { endCursor: null, hasNextPage: false },
              },
            },
          }),
        };
      }
      if (body.query === REVOKE_MEMBER) {
        // Simulate vault lock / component unmount occurring while mutation is in flight
        aborted = true;
        organizationStore.clear();
        return {
          ok: true,
          json: async () => ({
            data: {
              organization: {
                revokeMember: {
                  __typename: "OrganizationMember",
                  id: carol.memberId,
                  email: carol.email,
                  role: carol.role,
                  status: OrganizationMemberStatus.REVOKED,
                },
              },
            },
          }),
        };
      }
      throw new Error(`Unexpected query: ${body.query}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await revokeMemberWithRotation({
      org,
      memberId: carol.memberId,
      revokingSelf: false,
      isAborted: () => aborted,
    });

    expect(result.aborted).toBe(true);
    expect(get(unlockedOrgKeysStore).size).toBe(0);
    expect(get(organizationStore).organizations).toEqual([]);

    const allocated64ByteBuffers = getRandomSpy.mock.results
      .map((r) => r.value)
      .filter(
        (v): v is Uint8Array => v instanceof Uint8Array && v.byteLength === 64
      );
    expect(allocated64ByteBuffers).toHaveLength(1);
    expect(allocated64ByteBuffers[0].every((b) => b === 0)).toBe(true);
  });
});
