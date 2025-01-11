<script>
    let { data } = $props();

    import AccountSetup from '$components/AccountSetup.svelte';
    import VerifyAccountInvalidToken from '$components/VerifyAccountInvalidToken.svelte';

</script>


{#if !data.isInvalidToken}
    <AccountSetup verifiedEmail={data.verifiedEmail}/>
{:else}
    <VerifyAccountInvalidToken message={data.validationError.error}/>
{/if}

