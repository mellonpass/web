export const HTTPStatus = {
  OK: 200,
  PERMANENT_REDIRECT: 301,
  TEMPORARY_REDIRECT: 307,
  BAD_REQUEST: 400,
  FORBIDDEN: 403,
  UNPROCESSABLE_ENTITY: 422,
};

type RequestArgs = {
  method: string;
  url: string;
  payload?: { [key: string]: any };
  headers?: { [key: string]: any };
  options?: { [key: string]: any };
};

// { method, url, payload, headers = { 'content-type': 'application/json' }, options = {} }
export const requests = async ({
  method,
  url,
  payload,
  headers = { "content-type": "application/json" },
  options = {},
}: RequestArgs) => {
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
};
