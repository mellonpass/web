export const CREATE_CIPHER = `
    mutation CreateCipher($input: CreateCipherInput!) {
        cipher {
            create(input: $input) {
                __typename
                ... on CipherCreateSuccess {
                    id
                    name
                    type
                    key
                    isFavorite
                    data
                    created
                }
                ... on CipherCreateFailed {
                    message
                }
            }
        }
    }
`;

export const GET_CIPHERS = `
    query GetGiphers($first: Int!, $after: String) {
        ciphers(first: $first, after: $after) {
            edges {
                cursor
                node {
                    created
                    data
                    id
                    isFavorite
                    key
                    name
                    ownerId
                    type
                }
            }
            pageInfo {
                endCursor
                hasNextPage
            }
        }
    }
`;
