<script>
    import VaultLock from "$components/Vault/VaultLock.svelte";
    import VaultMain from "$components/Vault/VaultMain.svelte";
    import VaultSideNav from "$components/Vault/VaultSideNav.svelte";
    import { getContext, onMount, setContext } from "svelte";

    if (localStorage.getItem("emk") != null) {
        setContext("emk", localStorage.getItem("emk"));
        localStorage.removeItem("emk");
    }

    if (localStorage.getItem("epsk") != null) {
        setContext("epsk", localStorage.getItem("epsk"));
        localStorage.removeItem("epsk");
    }

    if (localStorage.getItem("token") != null) {
        setContext("token", localStorage.getItem("token"));
        localStorage.removeItem("token");
    }

    let isUnlock = $state(false);

    onMount(() => {
        isUnlock = getContext("epsk") != null;
    });

</script>


<div class="uk-flex" style="height: 100vh;">
    {#if isUnlock}
        <div class="x-vault-side-nav">
            <VaultSideNav />
        </div>
        <div class="x-vault-main uk-width-expand">
            <VaultMain />
        </div>
    {:else}
        <VaultLock />
    {/if}
</div>


<style>
    .x-vault-side-nav {
        width: 235px;
        height: 100%;
        overflow: scroll;
        background: #EEEEEE;
        border-right: 1px solid #E0E0E0;
    }

</style>
