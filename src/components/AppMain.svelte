<script lang="ts">
    import { onDestroy, onMount, setContext } from "svelte";
    import VaultLock from "$components/Vault/VaultLock.svelte";
    import VaultMain from "$components/Vault/VaultMain.svelte";
    import {
        clearUserRsaPrivateKey,
        getUserRsaPrivateKey,
        initializeUserRsaPrivateKey,
    } from "$lib/crypto-client";
    import { extractSymmetricKey } from "$lib/key-generation";
    import { getCiphers } from "$lib/services/ciphers";
    import {
        allVaultItemsStore,
        categoryFilter,
        cipherStore,
        newVaultItem,
        selectedVaultItem,
        vaultItemStore,
    } from "$lib/stores";
    import { decryptCipherForVaultItem } from "$lib/symmetric-encryption";
    import {
        type Cipher,
        CipherCategory,
        CipherType,
        type VaultItem,
        VaultStatus,
    } from "$lib/types";

    const initialMk = localStorage.getItem("mk");
    const initialEpsk = localStorage.getItem("epsk");
    const initialRsaProtectedKey = localStorage.getItem("rsa_protected_key");

    if (initialMk != null) {
        localStorage.removeItem("mk");
    }
    if (initialEpsk != null) {
        localStorage.removeItem("epsk");
    }
    if (initialRsaProtectedKey != null) {
        localStorage.removeItem("rsa_protected_key");
    }

    let mkState: string | null = $state(initialMk);
    let epskState: string | null = $state(initialEpsk);
    let rsaProtectedKeyState: string | null = $state(initialRsaProtectedKey);

    // Keep backwards compatibility for child components calling getContext("mk") / getContext("epsk")
    setContext("mk", initialMk);
    setContext("epsk", initialEpsk);
    setContext("getUserRsaPrivateKey", getUserRsaPrivateKey);

    let isUnlock = $state(Boolean(initialEpsk && initialMk));
    let isLoadingVault = $state(false);

    $effect(() => {
        if (
            isUnlock &&
            mkState &&
            epskState &&
            rsaProtectedKeyState &&
            !getUserRsaPrivateKey()
        ) {
            extractSymmetricKey(mkState, epskState)
                .then((sk) =>
                    initializeUserRsaPrivateKey(sk, rsaProtectedKeyState!)
                )
                .catch((err) => {
                    console.error(
                        "Failed to decrypt and initialize user RSA private key:",
                        err
                    );
                });
        }
    });

    export function lockVault() {
        mkState = null;
        epskState = null;
        rsaProtectedKeyState = null;
        clearUserRsaPrivateKey();
        $allVaultItemsStore = [];
        $vaultItemStore = [];
        $selectedVaultItem = null;
        isUnlock = false;
    }

    setContext("lockVault", lockVault);

    const categoryFilterFactory: Record<
        CipherCategory,
        (items: VaultItem[]) => VaultItem[]
    > = {
        [CipherCategory.All]: (items) =>
            items.filter((item) => item.status === VaultStatus.ACTIVE),
        [CipherCategory.FAVORITES]: (items) =>
            items.filter(
                (item) => item.isFavorite && item.status === VaultStatus.ACTIVE
            ),
        [CipherCategory.CARDS]: (items) =>
            items.filter(
                (item) =>
                    item.type === CipherType.CARD &&
                    item.status === VaultStatus.ACTIVE
            ),
        [CipherCategory.LOGINS]: (items) =>
            items.filter(
                (item) =>
                    item.type === CipherType.LOGIN &&
                    item.status === VaultStatus.ACTIVE
            ),
        [CipherCategory.SECURE_NOTES]: (items) =>
            items.filter(
                (item) =>
                    item.type === CipherType.SECURE_NOTE &&
                    item.status === VaultStatus.ACTIVE
            ),
        [CipherCategory.DATABASES]: (items) =>
            items.filter(
                (item) =>
                    item.type === CipherType.DATABASE &&
                    item.status === VaultStatus.ACTIVE
            ),
        [CipherCategory.ARCHIVES]: (items) =>
            items.filter((item) => item.status === VaultStatus.ARCHIVED),
        [CipherCategory.RECENTLY_DELETED]: (items) =>
            items.filter((item) => item.status === VaultStatus.DELETED),
        [CipherCategory.WATCHTOWER]: (items) =>
            items.filter((item) => item.status === VaultStatus.ACTIVE),
    };

    const applyFilterFromCache = (
        allItems: VaultItem[],
        category: CipherCategory,
        forceFirst: boolean = false
    ) => {
        const filtered = categoryFilterFactory[category]
            ? categoryFilterFactory[category](allItems)
            : allItems.filter((item) => item.status === VaultStatus.ACTIVE);
        const sorted = [...filtered].sort((a, b) =>
            a.name.localeCompare(b.name)
        );
        $vaultItemStore = sorted;

        if (sorted.length === 0) {
            $selectedVaultItem = null;
        } else if (forceFirst) {
            $selectedVaultItem = sorted[0];
        } else {
            const updatedRef = $selectedVaultItem
                ? sorted.find((item) => item.id === $selectedVaultItem!.id)
                : null;
            $selectedVaultItem = updatedRef ?? sorted[0];
        }
    };

    const decryptCiphers = async (
        ciphers: Array<Cipher>
    ): Promise<Array<VaultItem>> => {
        if (!mkState || !epskState) return [];
        const sk = await extractSymmetricKey(mkState, epskState);
        return await Promise.all(
            ciphers.map((cipher) => decryptCipherForVaultItem(sk, cipher))
        );
    };

    const loadAllCiphers = async () => {
        isLoadingVault = true;
        try {
            const ciphers = await getCiphers();
            $cipherStore = ciphers;

            if ($cipherStore.length <= 0) {
                $allVaultItemsStore = [];
                $vaultItemStore = [];
                return;
            }
            const decryptedAll = await decryptCiphers($cipherStore);
            $allVaultItemsStore = decryptedAll;
            applyFilterFromCache(decryptedAll, $categoryFilter, true);
        } finally {
            isLoadingVault = false;
        }
    };

    // Instant <1ms category filtering from in-memory decrypted store!
    const categoryFilterUnsubscriber = categoryFilter.subscribe((category) => {
        if (!isUnlock) return;
        applyFilterFromCache($allVaultItemsStore, category, true);
    });

    const allVaultItemsUnsubscriber = allVaultItemsStore.subscribe((allItems) => {
        if (!isUnlock) return;
        applyFilterFromCache(allItems, $categoryFilter, false);
    });

    // Called when a new vault item is created
    const newVaultItemUnsubscribe = newVaultItem.subscribe((vaultItem) => {
        if (vaultItem) {
            $categoryFilter = CipherCategory.All;
            $selectedVaultItem = vaultItem;
        }
    });

    onMount(async () => {
        if (isUnlock) {
            await loadAllCiphers();
        }
    });

    onDestroy(() => {
        newVaultItemUnsubscribe();
        categoryFilterUnsubscriber();
        allVaultItemsUnsubscriber();
    });
</script>

<div class="h-dvh w-screen overflow-hidden">
    {#if isUnlock}
        {#key `${mkState}:${epskState}`}
            <VaultMain {isLoadingVault} onLockVault={lockVault} />
        {/key}
    {:else}
        <VaultLock />
    {/if}
</div>
