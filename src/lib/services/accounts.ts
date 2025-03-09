import { PUBLIC_SERVER_URL } from "$env/static/public";
import { requests } from "$lib/requests";

export const createAccount = async (name: string, email: string) => {
  const response = await fetch(`${PUBLIC_SERVER_URL}/accounts/create`, {
    method: "POST",
    body: JSON.stringify({ name: name, email: email }),
    headers: {
      "content-type": "application/json",
    },
  });

  const data = await response.json();

  if (response.ok) {
    return data;
  }

  throw { error: data.error, statusCode: response.status };
};

export const verifyAccount = async (tokenId: string) => {
  const response = await fetch(`${PUBLIC_SERVER_URL}/accounts/verify`, {
    method: "POST",
    body: JSON.stringify({ token_id: tokenId }),
    headers: {
      "content-type": "application/json",
    },
  });

  const data = await response.json();

  if (response.ok) {
    return data;
  }

  throw { error: data.error, code: data.code, statusCode: response.status };
};

export const setupAccount = async (
  email: string,
  loginHash: string,
  protectedSymmetricKey: string,
  hint: string
) => {
  return await requests({
    method: "POST",
    url: `${PUBLIC_SERVER_URL}/accounts/setup`,
    payload: {
      email: email,
      protected_symmetric_key: protectedSymmetricKey,
      login_hash: loginHash,
      hint: hint,
    },
  });
};

export const loginAccount = async (email: string, loginHash: string) => {
  return await requests({
    method: "POST",
    url: `${PUBLIC_SERVER_URL}/accounts/login`,
    payload: { email: email, login_hash: loginHash },
    options: { credentials: "include" },
  });
};

export const logoutAccount = async () => {
  return await requests({
    method: "POST",
    url: `${PUBLIC_SERVER_URL}/accounts/logout`,
    options: { credentials: "include" },
  });
};

export const whoami = async () => {
  return await requests({
    method: "GET",
    url: `${PUBLIC_SERVER_URL}/accounts/whoami`,
    options: { credentials: "include" },
  });
};

export const unlock = async (loginHash: string) => {
  return await requests({
    method: "POST",
    url: `${PUBLIC_SERVER_URL}/accounts/unlock`,
    payload: { login_hash: loginHash },
    options: { credentials: "include" },
  });
};
