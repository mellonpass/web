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
import { assertNoGraphQLErrors, gqlClient } from "$lib/requests";
import {
  OrganizationMemberRole,
  type Organization,
  type OrganizationMember,
} from "$lib/types";

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
  memberId: string
): Promise<OrganizationMember> => {
  const response = await gqlClient({
    query: REVOKE_MEMBER,
    variables: {
      input: {
        memberId,
      },
    },
  });
  assertNoGraphQLErrors(response);
  return unwrapMutationPayload<OrganizationMember>(
    response?.data?.organization?.revokeMember,
    "OrganizationMember"
  );
};
