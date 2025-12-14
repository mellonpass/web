<script lang="ts">
    import { getContext, onDestroy, onMount, setContext } from "svelte";

    import VaultLock from "$components/Vault/VaultLock.svelte";
    import VaultMain from "$components/Vault/VaultMain.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { getCiphers } from "$lib/services/ciphers";
    import { categoryFilter, cipherStore, newVaultItem, selectedVaultItem, vaultItemStore } from "$lib/stores";
    import { decryptCipherForVaultItem } from "$lib/symmetric-encryption";
    import { type Cipher, CipherCategory, CipherType, type VaultItem, VaultStatus } from "$lib/types";

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
        const ciphers = await getCiphers();
        $cipherStore = ciphers;

        if ($cipherStore.length <= 0) { return []; }
        $vaultItemStore = await decryptCiphers($cipherStore);
        // Prioritize ACTIVE vault items to show.
        $vaultItemStore = $vaultItemStore.filter(item => item.status == VaultStatus.ACTIVE);
        // Sort vault items.
        $vaultItemStore = $vaultItemStore.sort((a, b) => a.name.localeCompare(b.name));
        selectVaultItem();
    };

    /**
     * Decrypt ciphers for list of vault items display.
     */
    const decryptCiphers = async (ciphers: Array<Cipher>): Promise<Array<VaultItem>> => {
        const result: Array<VaultItem> = []
        const sk = await extractSymmetricKey(mk, epsk);
        for (let cipher of ciphers) {
            const vaultItem = await decryptCipherForVaultItem(sk, cipher);
            result.push(vaultItem);
        }
        return result;
    };

    let isUnlock = $state(false);
    const categoryFilterFactory: Record<CipherCategory, (items: VaultItem[]) => VaultItem[]> = {
        [CipherCategory.All]: (items) => items.filter(item => item.status === VaultStatus.ACTIVE),
        [CipherCategory.FAVORITES]: (items) => items.filter(item => item.isFavorite && item.status === VaultStatus.ACTIVE),
        [CipherCategory.CARDS]: (items) => items.filter(item => item.type === CipherType.CARD && item.status === VaultStatus.ACTIVE),
        [CipherCategory.LOGINS]: (items) => items.filter(item => item.type === CipherType.LOGIN && item.status === VaultStatus.ACTIVE),
        [CipherCategory.SECURE_NOTES]: (items) => items.filter(item => item.type === CipherType.SECURE_NOTE && item.status === VaultStatus.ACTIVE),
        [CipherCategory.ARCHIVES]: (items) => items.filter(item => item.status === VaultStatus.ARCHIVED),
        [CipherCategory.RECENTLY_DELETED]: (items) => items.filter(item => item.status === VaultStatus.DELETED),
    };

    const categoryFilterUnsubscriber = categoryFilter.subscribe(async (category) => {
        if (!isUnlock || $cipherStore.length < 1) {
            return [];
        }
        // Decrypt and assign to vaultItemStore.
        $vaultItemStore = await decryptCiphers($cipherStore);
        // Apply category filter.
        $vaultItemStore = categoryFilterFactory[category]($vaultItemStore);

        $vaultItemStore = $vaultItemStore.sort((a, b) => a.name.localeCompare(b.name));
        selectVaultItem();
    });

    // Called when there is a new vault item added.
    const newVaultItemUnsubscribe = newVaultItem.subscribe(vaultItem => {
        if (vaultItem) {
            $selectedVaultItem = vaultItem;
            vaultItemStore.add(vaultItem!);
        }
        $categoryFilter = CipherCategory.All;
    });

    onMount(async () => {
        isUnlock = epsk != null;
        if (isUnlock) {
            await loadAllCiphers();
        }
    });

    onDestroy(() => {
        newVaultItemUnsubscribe();
        categoryFilterUnsubscriber();
    });

</script>


<div style="height: 100vh;">
    {#if isUnlock}
        <VaultMain/>
    {:else}
        <VaultLock />
    {/if}
</div>
