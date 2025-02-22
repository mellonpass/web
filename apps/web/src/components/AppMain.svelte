<script lang="ts">
    import VaultLock from "$components/Vault/VaultLock.svelte";
    import VaultMain from "$components/Vault/VaultMain.svelte";
    import VaultSideNav from "$components/Vault/VaultSideNav.svelte";
    import { extractSymmetricKey } from "$lib/key-generation";
    import { getCiphers } from "$lib/services/ciphers";
    import { categoryFilter, cipherStore, vaultItemStore } from "$lib/stores";
    import { decryptCipherForVaultItem } from "$lib/symmetric-encryption";
    import { CipherCategory, CipherType, type Cipher, type VaultItem } from "$lib/types";
    import { getContext, onDestroy, onMount, setContext } from "svelte";

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

    let isUnlock = $state(false);

    const loadAllCiphers = async (): Promise<Array<VaultItem>> => {
        const ciphers = await getCiphers({category: CipherCategory.All});
        $cipherStore = ciphers;

        if ($cipherStore.length <= 0) { return []; }
        return await decryptCiphers($cipherStore);
    };

    const decryptCiphers = async (ciphers: Array<Cipher>): Promise<Array<VaultItem>> => {
        const result: Array<VaultItem> = []
        const sk = await extractSymmetricKey(mk, epsk);
        for (let cipher of ciphers) {
            const vaultItem = await decryptCipherForVaultItem(sk, cipher);
            result.push(vaultItem);
        }
        return result;
    };

    const categoryFilterUnsubscriber = categoryFilter.subscribe(async (category) => {
        switch(category) {
            case CipherCategory.All:
                $vaultItemStore = await decryptCiphers($cipherStore);
                break;
            case CipherCategory.FAVORITES:
                const favorites = $cipherStore.filter(item => item.isFavorite);
                $vaultItemStore = await decryptCiphers(favorites);
                break;
            case CipherCategory.LOGINS:
                const logins = $cipherStore.filter(item => item.type == CipherType.LOGIN);
                $vaultItemStore = await decryptCiphers(logins);
                break;
            case CipherCategory.SECURE_NOTES:
                const notes = $cipherStore.filter(item => item.type == CipherType.SECURE_NOTE);
                $vaultItemStore = await decryptCiphers(notes);
                break;
            case CipherCategory.ARCHIVES:
            case CipherCategory.RECENTLY_DELETED:
                $vaultItemStore = [];
                break;
        }
    });

    onMount(async () => {
        isUnlock = epsk != null;
        if (isUnlock) {
            $vaultItemStore = await loadAllCiphers();
        }
    });

    onDestroy(() => {
        categoryFilterUnsubscriber();
    });

</script>


<div class="uk-flex" style="height: 100vh;">
    {#if isUnlock}
        <div class="x-vault-side-nav">
            <VaultSideNav/>
        </div>
        <div class="x-vault-main uk-width-expand">
            <VaultMain/>
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
