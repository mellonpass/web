import { redirect } from '@sveltejs/kit';
import { HTTPStatus } from '$lib/http';

import { whoami } from '$lib/services/accounts/index.js';

export const load = async ({ url }) => {
    try {
        const response = await whoami();
        localStorage.setItem("whoami", JSON.stringify(response.data));
    } catch (error) {
        redirect(HTTPStatus.TEMPORARY_REDIRECT, `/login?next=${url.pathname}`);
    }
};
