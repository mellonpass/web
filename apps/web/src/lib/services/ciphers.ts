import {
  CREATE_CIPHER,
  GET_CIPHER_DETAIL,
  GET_CIPHERS,
  UPDATE_CIPHER,
} from "$lib/gql/ciphers/schema";
import { gqlClient } from "$lib/requests";
import { CipherCategory, type Cipher } from "$lib/types";

export const createCipher = async (cipher: Cipher) => {
  return await gqlClient({
    query: CREATE_CIPHER,
    variables: {
      input: {
        type: cipher.type,
        key: cipher.key,
        name: cipher.name,
        data: cipher.data,
        isFavorite: false,
      },
    },
  });
};

export const getCiphers = async ({
  category,
}: {
  category: CipherCategory;
}): Promise<Array<Cipher>> => {
  let result: Array<Cipher> = [];
  let hasNextPage = true;
  const variables = {
    first: 100,
    after: undefined,
    filter: {
      category: category,
    },
  };

  while (hasNextPage) {
    const response = await gqlClient({
      query: GET_CIPHERS,
      variables: variables,
    });
    const edges = response.data.ciphers.edges;
    const pageInfo = response.data.ciphers.pageInfo;

    variables.after = pageInfo.endCursor;
    hasNextPage = pageInfo.hasNextPage;

    for (let edge of edges) {
      result.push(edge.node);
    }
  }

  return result;
};

export const getCipherById = async (id: string): Promise<Cipher> => {
  const response = await gqlClient({
    query: GET_CIPHER_DETAIL,
    variables: { id: id },
  });
  return response.data.cipher as Cipher;
};

export const updateCipher = async (cipher: Cipher) => {
  return await gqlClient({
    query: UPDATE_CIPHER,
    variables: {
      input: {
        id: cipher.id,
        key: cipher.key,
        name: cipher.name,
        data: cipher.data,
        isFavorite: cipher.isFavorite,
      },
    },
  });
};
