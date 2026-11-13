const ORGANIZATION_FIELDS = `
    id
    name
    created
    updated
    currentUserMembership {
        id
        email
        role
        status
        protectedSymmetricKey
    }
`;

const ORGANIZATION_MEMBER_FIELDS = `
    id
    email
    role
    status
    publicKey
    created
    updated
    user {
        id
        email
        name
        publicKey
    }
`;

export const GET_ORGANIZATIONS = `
    query GetOrganizations {
        organizations {
            ${ORGANIZATION_FIELDS}
        }
    }
`;

export const GET_ORGANIZATION = `
    query GetOrganization($id: GlobalID!) {
        organization(id: $id) {
            ${ORGANIZATION_FIELDS}
        }
    }
`;

export const GET_ORGANIZATION_MEMBERS = `
    query GetOrganizationMembers($organizationId: GlobalID!) {
        organizationMembers(organizationId: $organizationId) {
            ${ORGANIZATION_MEMBER_FIELDS}
        }
    }
`;

export const GET_PENDING_MEMBERS = `
    query GetPendingMembers($organizationId: GlobalID!) {
        pendingMembers(organizationId: $organizationId) {
            ${ORGANIZATION_MEMBER_FIELDS}
        }
    }
`;

export const CREATE_ORGANIZATION = `
    mutation CreateOrganization($input: CreateOrganizationInput!) {
        organization {
            create(input: $input) {
                __typename
                ... on Organization {
                    ${ORGANIZATION_FIELDS}
                }
                ... on OrganizationMutateFailed {
                    message
                }
            }
        }
    }
`;

export const INVITE_USER = `
    mutation InviteUser($input: InviteUserInput!) {
        organization {
            inviteUser(input: $input) {
                __typename
                ... on OrganizationMember {
                    ${ORGANIZATION_MEMBER_FIELDS}
                }
                ... on OrganizationMutateFailed {
                    message
                }
            }
        }
    }
`;

export const ACCEPT_ORGANIZATION_INVITE = `
    mutation AcceptOrganizationInvite($input: AcceptOrganizationInviteInput!) {
        organization {
            acceptInvite(input: $input) {
                __typename
                ... on OrganizationMember {
                    ${ORGANIZATION_MEMBER_FIELDS}
                }
                ... on OrganizationMutateFailed {
                    message
                }
            }
        }
    }
`;

export const CONFIRM_MEMBER = `
    mutation ConfirmMember($input: ConfirmMemberInput!) {
        organization {
            confirmMember(input: $input) {
                __typename
                ... on OrganizationMember {
                    ${ORGANIZATION_MEMBER_FIELDS}
                }
                ... on OrganizationMutateFailed {
                    message
                }
            }
        }
    }
`;

export const REVOKE_MEMBER = `
    mutation RevokeMember($input: RevokeMemberInput!) {
        organization {
            revokeMember(input: $input) {
                __typename
                ... on OrganizationMember {
                    ${ORGANIZATION_MEMBER_FIELDS}
                }
                ... on OrganizationMutateFailed {
                    message
                }
            }
        }
    }
`;
