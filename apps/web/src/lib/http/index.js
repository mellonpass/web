export const HTTPStatus = {
    OK: 200,
    TEMPORARY_REDIRECT: 307,
    BAD_REQUEST: 400,
    FORBIDDEN: 403,
    UNPROCESSABLE_ENTITY: 422,
};


export const requests = async (method, url, payload, headers = { "content-type": 'application/json' }) => {

    const response = await fetch(url, {
        method: method,
        body: JSON.stringify(payload),
        headers: headers
    });

    const data = await response.json();

    if (response.ok) {
        return data;
    }

    throw { error: data.error, code: data?.code, statusCode: response.status };
}