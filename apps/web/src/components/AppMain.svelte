<script lang="ts">
    import VaultLock from "$components/Vault/VaultLock.svelte";
    import VaultMain from "$components/Vault/VaultMain.svelte";
    import VaultSideNav from "$components/Vault/VaultSideNav.svelte";
    import { extractSymmetricKey } from "$lib/key-generation";
    import { getCiphers } from "$lib/services/ciphers";
    import { decryptCipher } from "$lib/symmetric-encryption";
    import { CipherCategory, type VaultItem } from "$lib/types";
    import { getContext, onMount, setContext } from "svelte";

    if (localStorage.getItem("mk") != null) {
        setContext("mk", localStorage.getItem("mk"));
        localStorage.removeItem("mk");
    }

    if (localStorage.getItem("epsk") != null) {
        setContext("epsk", localStorage.getItem("epsk"));
        localStorage.removeItem("epsk");
    }

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

    let filteredBy = $state(CipherCategory.All);
  
    let isUnlock = $state(false);
    let vaultItems: Array<VaultItem> = $state([]);

    const loadCipher = async (): Promise<Array<VaultItem>> => {
        const result: Array<VaultItem> = []

        const ciphers = await getCiphers({category: filteredBy});
        if (ciphers.length <= 0) { return []; }

        const sk = await extractSymmetricKey(mk, epsk);

        for (let cipher of ciphers) {
            const vaultItem = await decryptCipher(sk, cipher);
            result.push(vaultItem);
        }
        return result;
    };

    $effect(() => {
        loadCipher().then(items => {
            vaultItems = items;
        });
    });

    onMount(async () => {

        isUnlock = epsk != null;
        if (!isUnlock) { return; }

        vaultItems = await loadCipher();
    });

</script>


<div class="uk-flex" style="height: 100vh;">
    {#if isUnlock}
        <div class="x-vault-side-nav">
            <VaultSideNav bind:filteredBy={filteredBy} />
        </div>
        <div class="x-vault-main uk-width-expand">
            {#key vaultItems}
                <VaultMain bind:vaultListItems={vaultItems}/>
            {/key}
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
