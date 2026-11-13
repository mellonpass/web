import {
  CREATE_CIPHER,
  GET_CIPHER_DETAIL,
  GET_CIPHERS,
  RESTORE_CIPHER_FROM_DELETE,
  UPDATE_CIPHER,
  UPDATE_CIPHER_TO_DELETE,
} from "$lib/gql/ciphers/schema";
import { assertNoGraphQLErrors, gqlClient } from "$lib/requests";
import { type Cipher } from "$lib/types";

export const createCipher = async (cipher: Cipher) => {
  const response = await gqlClient({
    query: CREATE_CIPHER,
    variables: {
      input: {
        type: cipher.type,
        key: cipher.key,
        name: cipher.name,
        data: cipher.data,
        notes: cipher.notes,
        isFavorite: cipher.isFavorite,
        status: cipher.status,
        ...(cipher.organizationId
          ? { organizationId: cipher.organizationId }
          : {}),
      },
    },
  });
  assertNoGraphQLErrors(response);
  return response;
};

export const getCiphers = async (
  organizationId?: string | null
): Promise<Array<Cipher>> => {
  let result: Array<Cipher> = [];
  let hasNextPage = true;
  const variables: {
    first: number;
    after?: string;
    organizationId?: string;
  } = {
    first: 100,
    after: undefined,
    ...(organizationId ? { organizationId } : {}),
  };

  while (hasNextPage) {
    const response = await gqlClient({
      query: GET_CIPHERS,
      variables: variables,
    });
    assertNoGraphQLErrors(response);

    const ciphersConnection = response?.data?.ciphers;
    if (!ciphersConnection) {
      throw new Error("Unexpected empty response when fetching ciphers.");
    }

    const edges = ciphersConnection.edges;
    const pageInfo = ciphersConnection.pageInfo;

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
  assertNoGraphQLErrors(response);
  return response.data.cipher as Cipher;
};

export const updateCipher = async (cipher: Cipher) => {
  const response = await gqlClient({
    query: UPDATE_CIPHER,
    variables: {
      input: {
        id: cipher.id,
        key: cipher.key,
        isFavorite: cipher.isFavorite,
        name: cipher.name,
        status: cipher.status,
        data: cipher.data,
        notes: cipher.notes,
      },
    },
  });
  assertNoGraphQLErrors(response);
  return response;
};

export const updateCipherToDelete = async (cipher: Cipher) => {
  const response = await gqlClient({
    query: UPDATE_CIPHER_TO_DELETE,
    variables: {
      input: {
        id: cipher.id,
        key: cipher.key,
        isFavorite: cipher.isFavorite,
        name: cipher.name,
        status: cipher.status,
        data: cipher.data,
        notes: cipher.notes,
      },
    },
  });
  assertNoGraphQLErrors(response);
  return response;
};

export const restoreCipherFromDelete = async (cipher: Cipher) => {
  const response = await gqlClient({
    query: RESTORE_CIPHER_FROM_DELETE,
    variables: {
      input: {
        id: cipher.id,
        key: cipher.key,
        isFavorite: cipher.isFavorite,
        name: cipher.name,
        status: cipher.status,
        data: cipher.data,
        notes: cipher.notes,
      },
    },
  });
  assertNoGraphQLErrors(response);
  return response;
};
