import { CREATE_CIPHER } from "$lib/gql/ciphers/mutations";
import type { Cipher } from "$lib/models/ciphers";
import { gqlClient } from "$lib/requests";

export const createCipher = async (cipher: Cipher) => {
  return await gqlClient({
    operation: "mutation",
    query: CREATE_CIPHER,
    variables: { input: cipher.toDict() },
  });
};
