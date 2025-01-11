import { error } from '@sveltejs/kit';

import { HTTPStatus } from '$lib/http';
import { verifyAccount } from '$lib/services/accounts';

let isInvalidToken = false;
let restricted = false;
let validationError = {};
let verifiedEmail = null;

export const load = async ({ url }) => {
    try {
        const verifyResp = await verifyAccount(url.searchParams.get('token_id'));
        verifiedEmail = verifyResp.data.verified_email;
    } catch (err) {
        isInvalidToken = (err.statusCode == HTTPStatus.UNPROCESSABLE_ENTITY);
        if (isInvalidToken) {
            validationError = err;
        }

        restricted = err.statusCode == HTTPStatus.BAD_REQUEST || err.statusCode == HTTPStatus.FORBIDDEN;
        if (restricted) {
            error(err.statusCode, {
                message: err.code
            });
        }
    }

    return {
        "verifiedEmail": verifiedEmail,
        "isInvalidToken": isInvalidToken,
        "validationError": validationError,
    }
}
