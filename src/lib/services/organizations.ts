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
  encryptOrgKeyWithPublicKey,
  generateOrganizationSymmetricKey,
  rewrapCipherKey,
} from "$lib/key-generation";
import type { SymmetricKey } from "$lib/models/keys";
import { assertNoGraphQLErrors, gqlClient } from "$lib/requests";
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
  protectedSymmetricKey: string
): Promise<OrganizationMember> => {
  const response = await gqlClient({
    query: CONFIRM_MEMBER,
    variables: {
      input: {
        memberId,
        protectedSymmetricKey,
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
