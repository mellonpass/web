<script>
    import { onMount } from 'svelte';

    import { page } from '$app/stores';

    import { HTTPStatus } from '$lib/http';
    import { verifyAccount } from '$lib/services/accounts';

    import AccountSetup from '$components/AccountSetup.svelte';
    import PageError from '$components/PageError.svelte';
    import VerifyAccountInvalidToken from '$components/VerifyAccountInvalidToken.svelte';

    let renderPage = $state(false);
    let invalidToken = $state(false);
    let restricted = $state(false);
    let pageError = $state({});

    let verificationError = $state({});

    let verifiedEmail = $state(null);

    onMount(async () => {
        try {
            const verifyResp = await verifyAccount($page.url.searchParams.get('token_id'));
            verifiedEmail = verifyResp.data.verified_email;
        } catch (err) {

            invalidToken = (err.statusCode == HTTPStatus.UNPROCESSABLE_ENTITY);
            if (invalidToken) {
                verificationError = err;
            }

            restricted = err.statusCode == HTTPStatus.BAD_REQUEST || err.statusCode == HTTPStatus.FORBIDDEN;
            if (restricted) {
                pageError = err;
            }
        }
        renderPage = true;
    });

</script>


{#if renderPage}
    {#if !restricted}
        {#if !invalidToken}
            <AccountSetup verifiedEmail={verifiedEmail}/>
        {:else}
            <VerifyAccountInvalidToken message={verificationError.error}/>
        {/if}
    {:else}
        <PageError code={pageError.code}/>
    {/if}
{/if}

