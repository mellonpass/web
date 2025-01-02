<script>
    import { onMount } from 'svelte';

    import { page } from '$app/stores';

    import { HTTPStatus } from '$lib/http';
    import { verifyAccount } from '$lib/accounts';

    import AccountSetup from '../../components/AccountSetup.svelte';
    import Error from '../../components/Error.svelte';
    import VerifyAccountInvalidToken from '../../components/VerifyAccountInvalidToken.svelte';

    let renderPage = $state(false);
    let invalidToken = $state(false);
    let restricted = $state(false);
    let pageError = $state({});

    let verificationError = $state({});

    onMount(async () => {
        try {
            const verifyResp = await verifyAccount($page.url.searchParams.get('token_id'));
        } catch (err) {
            console.log(err);
            
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
            <AccountSetup/>
        {:else}
            <VerifyAccountInvalidToken message={verificationError.error}/>
        {/if}
    {:else}
        <Error code={pageError.code}/>
    {/if}
{/if}
