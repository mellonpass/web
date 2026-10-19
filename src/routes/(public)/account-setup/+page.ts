import { error } from "@sveltejs/kit";

import { HTTPStatus } from "$lib/requests";
import { verifyAccount } from "$lib/services/accounts";

export const load = async ({ url }) => {
  let isInvalidToken = false;
  let restricted = false;
  let validationError: { error: string; code: string; statusCode: number } | undefined;
  let verifiedEmail: string | null = null;

  try {
    const verifyResp = await verifyAccount(url.searchParams.get("token_id")!);
    verifiedEmail = verifyResp.data.verified_email;
  } catch (err: any) {
    isInvalidToken = err.statusCode == HTTPStatus.UNPROCESSABLE_ENTITY;
    if (isInvalidToken) {
      validationError = err;
    }

    restricted =
      err.statusCode == HTTPStatus.BAD_REQUEST ||
      err.statusCode == HTTPStatus.FORBIDDEN;
    if (restricted) {
      error(err.statusCode, {
        message: err.error || err.code || "Invalid or restricted verification request.",
      });
    }
  }

  return {
    verifiedEmail: verifiedEmail,
    isInvalidToken: isInvalidToken,
    validationError: validationError,
  };
};
