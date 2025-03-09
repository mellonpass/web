import { redirect } from "@sveltejs/kit";
import { HTTPStatus } from "$lib/requests";

import { whoami } from "$lib/services/accounts";

export const load = async ({ url }) => {
  const response = await whoami();
  if (response.data.auth) {
    delete response.data.auth;
    localStorage.setItem("whoami", JSON.stringify(response.data));
  } else {
    redirect(HTTPStatus.TEMPORARY_REDIRECT, `/login?next=${url.pathname}`);
  }
};
