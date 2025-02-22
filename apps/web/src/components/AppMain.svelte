<script lang="ts">
    import { getContext, onDestroy, onMount, setContext } from "svelte";

    import VaultLock from "$components/Vault/VaultLock.svelte";
    import VaultMain from "$components/Vault/VaultMain.svelte";
    import VaultSideNav from "$components/Vault/VaultSideNav.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { getCiphers } from "$lib/services/ciphers";
    import { categoryFilter, cipherStore, selectedVaultItem, vaultItemStore } from "$lib/stores";
    import { decryptCipherForVaultItem } from "$lib/symmetric-encryption";
    import { type Cipher, CipherCategory, CipherType, type VaultItem } from "$lib/types";

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

    const selectVaultItem = () => {
        if ($vaultItemStore.length > 0) {
            if ($selectedVaultItem == null) {
                $selectedVaultItem = $vaultItemStore[0];
            } else {
                if (!$vaultItemStore.find(item => item.id == $selectedVaultItem!.id)) {
                    $selectedVaultItem = $vaultItemStore[0];
                }
            }
        }
    };

    const loadAllCiphers = async () => {
        const ciphers = await getCiphers({category: CipherCategory.All});
        $cipherStore = ciphers;

        if ($cipherStore.length <= 0) { return []; }
        $vaultItemStore = await decryptCiphers($cipherStore);
        selectVaultItem();
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
        let filteredItems: Array<VaultItem> = [];
        switch(category) {
            case CipherCategory.All:
                filteredItems = await decryptCiphers($cipherStore);
                break;
            case CipherCategory.FAVORITES:
                const favorites = $cipherStore.filter(item => item.isFavorite);
                filteredItems = await decryptCiphers(favorites);
                break;
            case CipherCategory.LOGINS:
                const logins = $cipherStore.filter(item => item.type == CipherType.LOGIN);
                filteredItems = await decryptCiphers(logins);
                break;
            case CipherCategory.SECURE_NOTES:
                const notes = $cipherStore.filter(item => item.type == CipherType.SECURE_NOTE);
                filteredItems = await decryptCiphers(notes);
                break;
            case CipherCategory.ARCHIVES:
            case CipherCategory.RECENTLY_DELETED:
                filteredItems = [];
                break;
        }

        if (filteredItems.length > 0) {
            filteredItems = filteredItems.sort((a, b) => a.name.localeCompare(b.name));
        }

        $vaultItemStore = filteredItems;
        selectVaultItem();
    });

    onMount(async () => {
        isUnlock = epsk != null;
        if (isUnlock) {
            await loadAllCiphers();
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
