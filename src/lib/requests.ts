import { PUBLIC_SERVER_URL } from "$env/static/public";

export const HTTPStatus = {
  OK: 200,
  PERMANENT_REDIRECT: 301,
  TEMPORARY_REDIRECT: 307,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  UNPROCESSABLE_ENTITY: 422,
};

function getCookie(name: string) {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
}

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
  const csrftoken = getCookie("csrftoken");
  const mergedHeaders = {
    ...headers,
  };

  if (csrftoken) {
    // @ts-ignore
    mergedHeaders["X-CSRFToken"] = csrftoken;
  }

  const response = await fetch(url, {
    method: method,
    body: JSON.stringify(payload),
    headers: mergedHeaders,
    ...options,
  });

  const data = await response.json();

  if (response.ok) {
    return data;
  }

  throw { error: data.error, code: data?.code, statusCode: response.status };
}

export enum GQLOperation {
  Query = "query",
  Mutation = "mutation",
}

export async function gqlClient({
  query,
  variables = undefined,
  headers = undefined,
}: {
  query: string;
  variables?: object | undefined;
  headers?: HeadersInit | undefined;
}) {
  return await requests({
    method: "POST",
    url: `${PUBLIC_SERVER_URL}/graphql`,
    payload: { query: query, variables: variables },
    headers: headers,
    options: { credentials: "include" },
  });
}

/**
 * Throws an Error if a GraphQL response contains top-level errors.
 */
export function assertNoGraphQLErrors(response: any) {
  if (response?.errors?.length) {
    throw new Error(response.errors[0]?.message || "GraphQL request failed.");
  }
}

/**
 * Extracts a human-readable message from Error instances or structured API error payloads.
 */
export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (err && typeof err === "object") {
    const record = err as Record<string, unknown>;
    if (typeof record.message === "string" && record.message) {
      return record.message;
    }
    if (typeof record.error === "string" && record.error) {
      return record.error;
    }
  }
  return fallback;
}
