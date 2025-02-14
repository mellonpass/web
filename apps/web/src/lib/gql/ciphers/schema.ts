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
    query GetGiphers($first: Int!, $after: String, $filter: FilterCipher) {
        ciphers(first: $first, after: $after, filter: $filter) {
            edges {
                cursor
                node {
                    data
                    id
                    isFavorite
                    key
                    name
                    type
                    created
                }
            }
            pageInfo {
                endCursor
                hasNextPage
            }
        }
    }
`;

export const GET_CIPHER_DETAIL = `
    query GetcCipherDetail($id: GlobalID!) {
        cipher(id: $id) {
            data
            id
            isFavorite
            key
            name
            type
            created
        }
    }
`;
