import { PUBLIC_SERVER_URL } from "$env/static/public";

export const HTTPStatus = {
  OK: 200,
  PERMANENT_REDIRECT: 301,
  TEMPORARY_REDIRECT: 307,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  UNPROCESSABLE_ENTITY: 422,
};

interface RequestArgs {
  method: string;
  url: string;
  payload?: object | undefined;
  headers?: HeadersInit | undefined;
  options?: object | undefined;
}

// { method, url, payload, headers = { 'content-type': 'application/json' }, options = {} }
export async function requests({
  method,
  url,
  payload = undefined,
  headers = { "content-type": "application/json" },
  options = {},
}: RequestArgs): Promise<any> {
  const response = await fetch(url, {
    method: method,
    body: JSON.stringify(payload),
    headers: headers,
    ...options,
  });

  const data = await response.json();

  if (response.ok) {
    return data;
  }

  throw { error: data.error, code: data?.code, statusCode: response.status };
}

export async function gqlClient({
  operation,
  query,
  variables = undefined,
  headers = undefined,
}: {
  operation: string;
  query: string;
  variables?: object | undefined;
  headers?: HeadersInit | undefined;
}) {
  return await requests({
    method: operation == "query" ? "GET" : "POST",
    url: `${PUBLIC_SERVER_URL}/graphql`,
    payload: { query: query, variables: variables },
    headers: headers,
    options: { credentials: "include" },
  });
}
