import { PUBLIC_SERVER_URL } from '$env/static/public';
import { requests } from '$lib/http';

export const createAccount = async (name, email) => {
    const response = await fetch(`${PUBLIC_SERVER_URL}/accounts/create`, {
        method: 'POST',
        body: JSON.stringify({ 'name': name, 'email': email }),
        headers: {
            'content-type': 'application/json',
        },
    })

    const data = await response.json();

    if (response.ok) {
        return data;
    }

    throw { error: data.error, statusCode: response.status };
};


export const verifyAccount = async (token_id) => {
    const response = await fetch(`${PUBLIC_SERVER_URL}/accounts/verify`, {
        method: 'POST',
        body: JSON.stringify({ 'token_id': token_id }),
        headers: {
            'content-type': 'application/json',
        },
    })

    const data = await response.json();

    if (response.ok) {
        return data;
    }

    throw { error: data.error, code: data.code, statusCode: response.status };
};


export const setupAccount = async (email, loginHash, protectedSymmetricKey, hint) => {
    const encodedLH = btoa(loginHash);
    const encodedPSK = btoa(JSON.stringify(protectedSymmetricKey));

    return await requests(
        'POST',
        `${PUBLIC_SERVER_URL}/accounts/setup`,
        { 'email': email, 'protected_symmetric_key': encodedPSK, 'login_hash': encodedLH, 'hint': hint }
    );
};