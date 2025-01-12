import { redirect } from '@sveltejs/kit';
import { HTTPStatus } from '$lib/http';

import { whoami } from '$lib/services/accounts/index.js';

export const load = async ({ url }) => {
    let render = true;
    try {
        const response = await whoami();
        localStorage.setItem('whoami', JSON.stringify(response.data));
        await window.location.assign('/');
        render = false;
    } catch (err) {
        console.error(err);
    }
    return {
        render: render
    };
};
