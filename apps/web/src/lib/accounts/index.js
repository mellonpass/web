import { PUBLIC_SERVER_URL } from '$env/static/public';

export const checkEmailIfExists = async (email) => {
    const response = await fetch(`${PUBLIC_SERVER_URL}/accounts/check-email`, {
        method: "POST",
        body: JSON.stringify({ "email": email }),
        headers: {
            "content-type": "application/json",
        },
    })

    const data = await response.json();

    if (response.ok) {
        return data;
    }

    throw data.error;
};


export const createAccount = async (name, email) => {
    const response = await fetch(`${PUBLIC_SERVER_URL}/accounts/create`, {
        method: "POST",
        body: JSON.stringify({ "name": name, "email": email }),
        headers: {
            "content-type": "application/json",
        },
    })

    const data = await response.json();

    if (response.ok) {
        return data;
    }

    throw data.error;
};