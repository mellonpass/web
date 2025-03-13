import { whoami } from "$lib/services/accounts";

export const load = async () => {
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
