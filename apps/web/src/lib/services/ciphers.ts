import { CREATE_CIPHER, GET_CIPHERS } from "$lib/gql/ciphers/mutations";
import { gqlClient, GQLOperation } from "$lib/requests";
import type { Cipher, CipherItem } from "$lib/types";

export const createCipher = async (cipher: Cipher) => {
  return await gqlClient({
    query: CREATE_CIPHER,
    variables: {
      input: {
        type: cipher.type,
        key: cipher.key,
        name: cipher.name,
        data: cipher.data,
      },
    },
  });
};

export const getCiphers = async (): Promise<Array<CipherItem>> => {
  let result: Array<CipherItem> = [];
  let hasNextPage = true;
  const variables = { first: 100, after: undefined };

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
