import { get } from "svelte/store";
import { getOrAwaitUserRsaPrivateKey } from "$lib/crypto-client";
import {
  ACCEPT_ORGANIZATION_INVITE,
  CONFIRM_MEMBER,
  CREATE_ORGANIZATION,
  GET_ORGANIZATION,
  GET_ORGANIZATION_MEMBERS,
  GET_ORGANIZATIONS,
  GET_PENDING_MEMBERS,
  INVITE_USER,
  REVOKE_MEMBER,
} from "$lib/gql/organizations/schema";
import {
  decryptOrgKeyWithPrivateKey,
  encryptOrgKeyWithPublicKey,
  generateOrganizationSymmetricKey,
  rewrapCipherKey,
} from "$lib/key-generation";
import type { SymmetricKey } from "$lib/models/keys";
import { assertNoGraphQLErrors, gqlClient } from "$lib/requests";
import { getCiphers } from "$lib/services/ciphers";
import {
  cipherStore,
  matchesVaultContext,
  organizationStore,
} from "$lib/stores";
import {
  OrganizationMemberRole,
  OrganizationMemberStatus,
  type Cipher,
  type Organization,
  type OrganizationMember,
  type RevokeOrganizationMemberRotationInput,
  type RotatedCipherKeyInput,
  type RotatedMemberKeyInput,
} from "$lib/types";

export type {
  RevokeOrganizationMemberRotationInput,
  RotatedCipherKeyInput,
  RotatedMemberKeyInput,
} from "$lib/types";

export interface PreparedMemberRevocationRotation {
  newOsk: SymmetricKey;
  rotation: RevokeOrganizationMemberRotationInput;
}

export function getMemberPublicKey(member: OrganizationMember): string | null {
  return member.publicKey || member.user?.publicKey || null;
}

/**
 * Generates a fresh 512-bit Organization Symmetric Key, wraps it for every
 * remaining confirmed member via RSA-OAEP-4096, and re-wraps all organization
 * cipher keys from oldOsk to newOsk. Zeroes newOsk on preparation failure.
 */
export async function prepareMemberRevocationRotation({
  oldOsk,
  revokedMemberId,
  members,
  ciphers,
  expectedKeyVersion,
}: {
  oldOsk: SymmetricKey;
  revokedMemberId: string;
  members: OrganizationMember[];
  ciphers: Cipher[];
  expectedKeyVersion: number;
}): Promise<PreparedMemberRevocationRotation> {
  const remainingConfirmed = members.filter(
    (m) =>
      m.status === OrganizationMemberStatus.CONFIRMED &&
      m.id !== revokedMemberId
  );

  const newOsk = generateOrganizationSymmetricKey();
  try {
    const memberKeys: RotatedMemberKeyInput[] = await Promise.all(
      remainingConfirmed.map(async (confirmedMember) => {
        const pubKey = getMemberPublicKey(confirmedMember);
        if (!pubKey) {
          throw new Error(
            `Cannot rotate organization key: missing RSA public key for ${confirmedMember.email}.`
          );
        }
        return {
          memberId: confirmedMember.id,
          protectedSymmetricKey: await encryptOrgKeyWithPublicKey(
            pubKey,
            newOsk
          ),
        };
      })
    );

    const cipherKeys: RotatedCipherKeyInput[] = await Promise.all(
      ciphers.map(async (cipher) => {
        if (!cipher.id) {
          throw new Error(
            "Encountered an organization cipher without an identifier."
          );
        }
        return {
          cipherId: cipher.id,
          key: await rewrapCipherKey(oldOsk, newOsk, cipher.key),
        };
      })
    );

    return {
      newOsk,
      rotation: {
        expectedKeyVersion,
        memberKeys,
        cipherKeys,
      },
    };
  } catch (err) {
    try {
      newOsk.keybuffer.fill(0);
    } catch {}
    throw err;
  }
}

function unwrapMutationPayload<T>(payload: any, expectedTypename: string): T {
  if (!payload || payload.__typename !== expectedTypename) {
    throw new Error(payload?.message || "Organization operation failed.");
  }
  return payload as T;
}

export const getOrganizations = async (): Promise<Organization[]> => {
  const response = await gqlClient({
    query: GET_ORGANIZATIONS,
  });
  assertNoGraphQLErrors(response);
  return (response?.data?.organizations ?? []) as Organization[];
};

export const getOrganization = async (
  id: string
): Promise<Organization | null> => {
  const response = await gqlClient({
    query: GET_ORGANIZATION,
    variables: { id },
  });
  assertNoGraphQLErrors(response);
  return (response?.data?.organization ?? null) as Organization | null;
};

export const getOrganizationMembers = async (
  organizationId: string
): Promise<OrganizationMember[]> => {
  const response = await gqlClient({
    query: GET_ORGANIZATION_MEMBERS,
    variables: { organizationId },
  });
  assertNoGraphQLErrors(response);
  return (response?.data?.organizationMembers ?? []) as OrganizationMember[];
};

export const getPendingMembers = async (
  organizationId: string
): Promise<OrganizationMember[]> => {
  const response = await gqlClient({
    query: GET_PENDING_MEMBERS,
    variables: { organizationId },
  });
  assertNoGraphQLErrors(response);
  return (response?.data?.pendingMembers ?? []) as OrganizationMember[];
};

export const createOrganization = async (
  name: string,
  protectedSymmetricKey: string
): Promise<Organization> => {
  const response = await gqlClient({
    query: CREATE_ORGANIZATION,
    variables: {
      input: {
        name,
        protectedSymmetricKey,
      },
    },
  });
  assertNoGraphQLErrors(response);
  return unwrapMutationPayload<Organization>(
    response?.data?.organization?.create,
    "Organization"
  );
};

export const inviteOrganizationUser = async (
  organizationId: string,
  email: string,
  role: OrganizationMemberRole = OrganizationMemberRole.MEMBER
): Promise<OrganizationMember> => {
  const response = await gqlClient({
    query: INVITE_USER,
    variables: {
      input: {
        organizationId,
        email,
        role,
      },
    },
  });
  assertNoGraphQLErrors(response);
  return unwrapMutationPayload<OrganizationMember>(
    response?.data?.organization?.inviteUser,
    "OrganizationMember"
  );
};

export const acceptOrganizationInvite = async (
  inviteToken: string
): Promise<OrganizationMember> => {
  const response = await gqlClient({
    query: ACCEPT_ORGANIZATION_INVITE,
    variables: {
      input: {
        inviteToken,
      },
    },
  });
  assertNoGraphQLErrors(response);
  return unwrapMutationPayload<OrganizationMember>(
    response?.data?.organization?.acceptInvite,
    "OrganizationMember"
  );
};

export const confirmOrganizationMember = async (
  memberId: string,
  protectedSymmetricKey: string,
  expectedKeyVersion?: number
): Promise<OrganizationMember> => {
  const response = await gqlClient({
    query: CONFIRM_MEMBER,
    variables: {
      input: {
        memberId,
        protectedSymmetricKey,
        ...(expectedKeyVersion !== undefined ? { expectedKeyVersion } : {}),
      },
    },
  });
  assertNoGraphQLErrors(response);
  return unwrapMutationPayload<OrganizationMember>(
    response?.data?.organization?.confirmMember,
    "OrganizationMember"
  );
};

export const revokeOrganizationMember = async (
  memberId: string,
  rotation?: RevokeOrganizationMemberRotationInput
): Promise<OrganizationMember> => {
  const input: {
    memberId: string;
    expectedKeyVersion?: number;
    memberKeys?: RotatedMemberKeyInput[];
    cipherKeys?: RotatedCipherKeyInput[];
  } = {
    memberId,
  };

  if (rotation) {
    if (rotation.expectedKeyVersion !== undefined) {
      input.expectedKeyVersion = rotation.expectedKeyVersion;
    }
    input.memberKeys = rotation.memberKeys;
    input.cipherKeys = rotation.cipherKeys;
  }

  const response = await gqlClient({
    query: REVOKE_MEMBER,
    variables: {
      input,
    },
  });
  assertNoGraphQLErrors(response);
  return unwrapMutationPayload<OrganizationMember>(
    response?.data?.organization?.revokeMember,
    "OrganizationMember"
  );
};

export function zeroSymmetricKey(key: SymmetricKey | null | undefined): void {
  if (!key) return;
  try {
    key.keybuffer.fill(0);
  } catch {}
}

function applyFreshOrganizationMetadata(freshOrg: Organization): void {
  const current = get(organizationStore).organizations;
  if (!current.some((o) => o.id === freshOrg.id)) return;
  organizationStore.setOrganizations(
    current.map((o) => (o.id === freshOrg.id ? freshOrg : o))
  );
}

export async function resolveOrgSymmetricKey(
  org: Organization
): Promise<SymmetricKey> {
  const cached = organizationStore.getDecryptedKey(org.id);
  if (cached) return cached;

  const protectedKey = org.currentUserMembership?.protectedSymmetricKey;
  if (!protectedKey) {
    throw new Error(
      "Protected organization key is missing for your membership."
    );
  }
  const privateKey = await getOrAwaitUserRsaPrivateKey();
  if (!privateKey) {
    throw new Error(
      "Your RSA private key is not unlocked in memory. Please unlock your vault again."
    );
  }

  const osk = await decryptOrgKeyWithPrivateKey(privateKey, protectedKey);
  organizationStore.setDecryptedKey(org.id, osk);
  return osk;
}

async function reconcileOrganizationKey(
  cachedOrg: Organization,
  freshOrg: Organization,
  isAborted?: () => boolean
): Promise<SymmetricKey | null> {
  const cachedKey = organizationStore.getDecryptedKey(cachedOrg.id);
  const keyVersionMatches =
    freshOrg.keyVersion === undefined ||
    cachedOrg.keyVersion === undefined ||
    freshOrg.keyVersion === cachedOrg.keyVersion;
  const protectedKeyMatches =
    freshOrg.currentUserMembership?.protectedSymmetricKey ===
    cachedOrg.currentUserMembership?.protectedSymmetricKey;

  if (cachedKey && keyVersionMatches && protectedKeyMatches) {
    return cachedKey;
  }

  const updatedProtectedKey =
    freshOrg.currentUserMembership?.protectedSymmetricKey;
  if (!updatedProtectedKey) {
    if (cachedKey) return cachedKey;
    throw new Error(
      "Your organization membership key is out of date. Please reload your vault and try again."
    );
  }

  const privateKey = await getOrAwaitUserRsaPrivateKey();
  if (isAborted?.()) return null;
  if (!privateKey) {
    throw new Error(
      "Your RSA private key is not unlocked in memory. Please unlock your vault again."
    );
  }

  const freshOsk = await decryptOrgKeyWithPrivateKey(
    privateKey,
    updatedProtectedKey
  );
  if (isAborted?.()) {
    zeroSymmetricKey(freshOsk);
    return null;
  }

  organizationStore.setDecryptedKey(cachedOrg.id, freshOsk);
  return freshOsk;
}

export async function syncOrganizationAndKey(
  org: Organization,
  options?: { isAborted?: () => boolean }
): Promise<{ org: Organization; osk: SymmetricKey } | null> {
  const freshOrg = await getOrganization(org.id);
  if (options?.isAborted?.()) return null;
  if (!freshOrg) {
    throw new Error(
      "Organization no longer exists or your access was revoked."
    );
  }

  applyFreshOrganizationMetadata(freshOrg);
  const osk = await reconcileOrganizationKey(org, freshOrg, options?.isAborted);
  if (!osk) return null;

  return { org: freshOrg, osk };
}

async function refreshOrganizationMetadata(
  org: Organization,
  expectedKeyVersion: number,
  memberKeys: RotatedMemberKeyInput[],
  isAborted?: () => boolean
): Promise<Organization> {
  const myMembershipId = org.currentUserMembership?.id;
  const myNewProtectedKey = myMembershipId
    ? memberKeys.find((mk) => mk.memberId === myMembershipId)
        ?.protectedSymmetricKey
    : undefined;
  const fallbackOrg: Organization = {
    ...org,
    keyVersion: expectedKeyVersion + 1,
    currentUserMembership: org.currentUserMembership
      ? {
          ...org.currentUserMembership,
          ...(myNewProtectedKey
            ? { protectedSymmetricKey: myNewProtectedKey }
            : {}),
        }
      : org.currentUserMembership,
  };

  try {
    const refreshedOrgs = await getOrganizations();
    if (isAborted?.()) return fallbackOrg;
    organizationStore.setOrganizations(refreshedOrgs);
    return refreshedOrgs.find((o) => o.id === org.id) ?? fallbackOrg;
  } catch {
    if (isAborted?.()) return fallbackOrg;
    organizationStore.setOrganizations(
      get(organizationStore).organizations.map((o) =>
        o.id === org.id ? fallbackOrg : o
      )
    );
    return fallbackOrg;
  }
}

export interface RevokeMemberWithRotationResult {
  aborted: boolean;
  revokingSelf: boolean;
  refreshedOrg: Organization | null;
  remainingOrgCount: number;
}

export async function revokeMemberWithRotation({
  org,
  memberId,
  revokingSelf,
  isAborted,
}: {
  org: Organization;
  memberId: string;
  revokingSelf: boolean;
  isAborted?: () => boolean;
}): Promise<RevokeMemberWithRotationResult> {
  let newOsk: SymmetricKey | null = null;
  let mutationSucceeded = false;

  try {
    const [freshOrg, allMembers, orgCiphers] = await Promise.all([
      getOrganization(org.id),
      getOrganizationMembers(org.id),
      getCiphers(org.id),
    ]);

    if (isAborted?.()) {
      return {
        aborted: true,
        revokingSelf,
        refreshedOrg: null,
        remainingOrgCount: 0,
      };
    }

    if (!freshOrg) {
      throw new Error(
        "Organization no longer exists or your access was revoked."
      );
    }

    applyFreshOrganizationMetadata(freshOrg);

    const oldOsk = await reconcileOrganizationKey(org, freshOrg, isAborted);
    if (!oldOsk) {
      return {
        aborted: true,
        revokingSelf,
        refreshedOrg: null,
        remainingOrgCount: 0,
      };
    }

    const expectedKeyVersion = freshOrg.keyVersion ?? org.keyVersion ?? 1;
    const prepared = await prepareMemberRevocationRotation({
      oldOsk,
      revokedMemberId: memberId,
      members: allMembers,
      ciphers: orgCiphers,
      expectedKeyVersion,
    });
    newOsk = prepared.newOsk;

    if (isAborted?.()) {
      zeroSymmetricKey(newOsk);
      return {
        aborted: true,
        revokingSelf,
        refreshedOrg: null,
        remainingOrgCount: 0,
      };
    }

    await revokeOrganizationMember(memberId, prepared.rotation);
    mutationSucceeded = true;

    if (isAborted?.()) {
      zeroSymmetricKey(oldOsk);
      zeroSymmetricKey(newOsk);
      return {
        aborted: true,
        revokingSelf,
        refreshedOrg: null,
        remainingOrgCount: 0,
      };
    }

    if (revokingSelf) {
      zeroSymmetricKey(oldOsk);
      zeroSymmetricKey(newOsk);
      organizationStore.removeDecryptedKey(org.id);
      cipherStore.update((items) =>
        items.filter((item) => !matchesVaultContext(item, org.id))
      );
      const remainingOrgs = get(organizationStore).organizations.filter(
        (o) => o.id !== org.id
      );
      organizationStore.setOrganizations(remainingOrgs);
      return {
        aborted: false,
        revokingSelf: true,
        refreshedOrg: null,
        remainingOrgCount: remainingOrgs.length,
      };
    }

    zeroSymmetricKey(oldOsk);
    organizationStore.setDecryptedKey(org.id, newOsk);

    const rotatedKeyById = new Map(
      prepared.rotation.cipherKeys.map((entry) => [entry.cipherId, entry.key])
    );
    cipherStore.update((items) =>
      items.map((item) => {
        const updatedKey = item.id ? rotatedKeyById.get(item.id) : undefined;
        return updatedKey ? { ...item, key: updatedKey } : item;
      })
    );

    const refreshedOrg = await refreshOrganizationMetadata(
      freshOrg,
      expectedKeyVersion,
      prepared.rotation.memberKeys,
      isAborted
    );

    return {
      aborted: false,
      revokingSelf: false,
      refreshedOrg,
      remainingOrgCount: get(organizationStore).organizations.length,
    };
  } catch (err) {
    if (!mutationSucceeded) {
      zeroSymmetricKey(newOsk);
    }
    throw err;
  }
}
