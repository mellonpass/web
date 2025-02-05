export const CREATE_CIPHER = `
    mutation CreateCipher($input: CreateCipherInput!) {
        createCipher: Cipher {
            create: createCipher(input: $input) {
                ... on CipherCreateSuccess {
                    __typename
                    cipher {
                        id
                        name
                        type
                        key
                        isFavorite
                        data
                        created
                    }
                }
                ... on CipherCreateForbidden {
                    __typename
                    message
                }
            }
        }
    }
`;
