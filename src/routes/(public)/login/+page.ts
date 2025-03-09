import { redirect } from "@sveltejs/kit";
import { HTTPStatus } from "$lib/requests";

import { whoami } from "$lib/services/accounts";

export const load = async ({ url }) => {
  let render = true;

  const response = await whoami();
  if (response.data.auth) {
    localStorage.setItem("whoami", JSON.stringify(response.data));
    await window.location.assign("/");
    render = false;
  }

  return {
    render: render,
  };
};
