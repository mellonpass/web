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
