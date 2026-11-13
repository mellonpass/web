<script lang="ts">
    import { onDestroy, onMount, setContext } from "svelte";
    import VaultLock from "$components/Vault/VaultLock.svelte";
    import VaultMain from "$components/Vault/VaultMain.svelte";
    import {
        clearUserRsaPrivateKey,
        getOrAwaitUserRsaPrivateKey,
        getUserRsaPrivateKey,
        initializeUserRsaPrivateKey,
    } from "$lib/crypto-client";
    import {
        decryptOrgKeyWithPrivateKey,
        extractSymmetricKey,
    } from "$lib/key-generation";
    import { getCiphers } from "$lib/services/ciphers";
    import { getOrganizations } from "$lib/services/organizations";
    import { toast } from "$lib/toast.svelte";
    import type { SymmetricKey } from "$lib/models/keys";
    import {
        allVaultItemsStore,
        categoryFilter,
        cipherStore,
        matchesVaultContext,
        newVaultItem,
        organizationStore,
        selectedVaultItem,
        vaultItemStore,
        type VaultContext,
    } from "$lib/stores";
    import { decryptCipherForVaultItem } from "$lib/symmetric-encryption";
    import { resolveCipherSymmetricKey } from "$lib/vaults";
    import {
        type Cipher,
        CipherCategory,
        CipherType,
        type VaultItem,
        VaultStatus,
    } from "$lib/types";

    const initialMk = localStorage.getItem("mk") ?? sessionStorage.getItem("mk");
    const initialEpsk =
        localStorage.getItem("epsk") ?? sessionStorage.getItem("epsk");
    const initialRsaProtectedKey =
        sessionStorage.getItem("rsa_protected_key") ??
        localStorage.getItem("rsa_protected_key");

    if (initialMk != null) {
        localStorage.removeItem("mk");
        sessionStorage.removeItem("mk");
    }
    if (initialEpsk != null) {
        localStorage.removeItem("epsk");
        sessionStorage.removeItem("epsk");
    }
    if (initialRsaProtectedKey != null) {
        sessionStorage.removeItem("rsa_protected_key");
        localStorage.removeItem("rsa_protected_key");
    }

    let mkState: string | null = $state(initialMk);
    let epskState: string | null = $state(initialEpsk);
    let rsaProtectedKeyState: string | null = $state(initialRsaProtectedKey);

    // Keep backwards compatibility for child components calling getContext("mk") / getContext("epsk")
    setContext("mk", initialMk);
    setContext("epsk", initialEpsk);
    setContext("getUserRsaPrivateKey", getUserRsaPrivateKey);
    setContext("getOrAwaitUserRsaPrivateKey", getOrAwaitUserRsaPrivateKey);

    let isUnlock = $state(Boolean(initialEpsk && initialMk));
    let isLoadingVault = $state(false);
    let rsaKeyInitAttempted = $state(false);

    let cachedSkPromise: Promise<SymmetricKey> | null = null;
    const getSymmetricKey = (): Promise<SymmetricKey> => {
        if (!mkState || !epskState) {
            return Promise.reject(new Error("Vault is locked"));
        }
        if (!cachedSkPromise) {
            cachedSkPromise = extractSymmetricKey(mkState, epskState);
        }
        return cachedSkPromise;
    };

    $effect(() => {
        if (
            isUnlock &&
            mkState &&
            epskState &&
            rsaProtectedKeyState &&
            !getUserRsaPrivateKey() &&
            !rsaKeyInitAttempted
        ) {
            rsaKeyInitAttempted = true;
            getSymmetricKey()
                .then((sk) =>
                    initializeUserRsaPrivateKey(sk, rsaProtectedKeyState!)
                )
                .catch((err) => {
                    console.error(
                        "Failed to decrypt and initialize user RSA private key:",
                        err
                    );
                    toast.show({
                        title: "Cryptographic Key Error",
                        description:
                            "Failed to decrypt user RSA private key. Organization features may be unavailable.",
                        variant: "danger",
                    });
                });
        }
    });

    let loadGeneration = 0;

    export function lockVault() {
        loadGeneration++;
        isLoadingVault = false;
        mkState = null;
        epskState = null;
        rsaProtectedKeyState = null;
        rsaKeyInitAttempted = false;
        cachedSkPromise = null;
        clearUserRsaPrivateKey();
        organizationStore.clear();
        sessionStorage.removeItem("rsa_protected_key");
        localStorage.removeItem("rsa_protected_key");
        $cipherStore = [];
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
        vaultContext: VaultContext = $organizationStore.vaultContext,
        forceFirst: boolean = false
    ) => {
        const contextScoped = allItems.filter((item) =>
            matchesVaultContext(item, vaultContext)
        );
        const filtered = categoryFilterFactory[category]
            ? categoryFilterFactory[category](contextScoped)
            : contextScoped.filter((item) => item.status === VaultStatus.ACTIVE);
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
        const sk = await getSymmetricKey();
        const results = await Promise.allSettled(
            ciphers.map((cipher) => {
                const effectiveSk = resolveCipherSymmetricKey(cipher, sk);
                return decryptCipherForVaultItem(effectiveSk, cipher);
            })
        );
        const decrypted: Array<VaultItem> = [];
        for (const result of results) {
            if (result.status === "fulfilled") {
                decrypted.push(result.value);
            } else {
                console.error("Failed to decrypt cipher:", result.reason);
            }
        }
        return decrypted;
    };

    const loadAllCiphers = async () => {
        const currentGen = ++loadGeneration;
        const isStale = () =>
            currentGen !== loadGeneration || !isUnlock || !mkState || !epskState;

        isLoadingVault = true;
        try {
            const sk = await getSymmetricKey();
            if (isStale()) return;

            if (rsaProtectedKeyState && !getUserRsaPrivateKey()) {
                rsaKeyInitAttempted = true;
                try {
                    await initializeUserRsaPrivateKey(sk, rsaProtectedKeyState);
                } catch (err) {
                    console.error(
                        "Failed to decrypt and initialize user RSA private key:",
                        err
                    );
                }
                if (isStale()) return;
            }

            let orgsWithKeys: string[] = [];
            const failedKeyOrgs: string[] = [];
            try {
                const orgs = await getOrganizations();
                if (isStale()) return;
                organizationStore.setOrganizations(orgs);

                const privateKey = await getOrAwaitUserRsaPrivateKey();
                if (isStale()) return;

                for (const org of orgs) {
                    const protectedOsk =
                        org.currentUserMembership?.protectedSymmetricKey;
                    if (!protectedOsk) continue;
                    if (!privateKey) {
                        failedKeyOrgs.push(org.name);
                        continue;
                    }
                    try {
                        const osk = await decryptOrgKeyWithPrivateKey(
                            privateKey,
                            protectedOsk
                        );
                        if (isStale()) return;
                        organizationStore.setDecryptedKey(org.id, osk);
                        orgsWithKeys.push(org.id);
                    } catch (err) {
                        failedKeyOrgs.push(org.name);
                        console.error(
                            `Failed to decrypt OSK for organization ${org.name}:`,
                            err
                        );
                    }
                }
            } catch (err) {
                if (isStale()) return;
                console.error("Failed to load organizations:", err);
                toast.show({
                    title: "Organization Load Error",
                    description:
                        "Failed to load organizations. Only personal items will be shown.",
                    variant: "warning",
                });
            }

            if (failedKeyOrgs.length > 0) {
                toast.show({
                    title: "Organization Key Unavailable",
                    description: `Could not unlock shared vault key for: ${failedKeyOrgs.join(", ")}.`,
                    variant: "warning",
                });
            }

            const [personalResult, ...orgResults] = await Promise.allSettled([
                getCiphers(null),
                ...orgsWithKeys.map((orgId) => getCiphers(orgId)),
            ]);
            if (isStale()) return;

            if (personalResult.status === "rejected") {
                throw personalResult.reason;
            }
            const personalCiphers = personalResult.value;

            let failedOrgFetchCount = 0;
            const orgCipherBatches: Array<Array<Cipher>> = [];
            for (const res of orgResults) {
                if (res.status === "fulfilled") {
                    orgCipherBatches.push(res.value);
                } else {
                    failedOrgFetchCount++;
                    console.error(
                        "Failed to load organization ciphers:",
                        res.reason
                    );
                }
            }

            if (failedOrgFetchCount > 0) {
                toast.show({
                    title: "Partial Vault Load",
                    description: `Failed to fetch items for ${failedOrgFetchCount} organization${failedOrgFetchCount > 1 ? "s" : ""}.`,
                    variant: "warning",
                });
            }

            const cipherMap = new Map<string, Cipher>();
            for (const c of personalCiphers) {
                if (c.id) cipherMap.set(c.id, c);
            }
            for (const batch of orgCipherBatches) {
                for (const c of batch) {
                    if (c.id) cipherMap.set(c.id, c);
                }
            }

            const ciphers = Array.from(cipherMap.values());
            $cipherStore = ciphers;

            if ($cipherStore.length <= 0) {
                $allVaultItemsStore = [];
                $vaultItemStore = [];
                return;
            }
            const decryptedAll = await decryptCiphers($cipherStore);
            if (isStale()) return;

            $allVaultItemsStore = decryptedAll;
            applyFilterFromCache(
                decryptedAll,
                $categoryFilter,
                $organizationStore.vaultContext,
                true
            );
        } finally {
            if (currentGen === loadGeneration) {
                isLoadingVault = false;
            }
        }
    };

    setContext("reloadVault", loadAllCiphers);

    // Instant <1ms category filtering from in-memory decrypted store!
    const categoryFilterUnsubscriber = categoryFilter.subscribe((category) => {
        if (!isUnlock) return;
        applyFilterFromCache(
            $allVaultItemsStore,
            category,
            $organizationStore.vaultContext,
            true
        );
    });

    const allVaultItemsUnsubscriber = allVaultItemsStore.subscribe((allItems) => {
        if (!isUnlock) return;
        applyFilterFromCache(
            allItems,
            $categoryFilter,
            $organizationStore.vaultContext,
            false
        );
    });

    let lastVaultContext: VaultContext = $organizationStore.vaultContext;
    const organizationStoreUnsubscriber = organizationStore.subscribe(
        (state) => {
            if (!isUnlock) return;
            if (state.vaultContext !== lastVaultContext) {
                lastVaultContext = state.vaultContext;
                applyFilterFromCache(
                    $allVaultItemsStore,
                    $categoryFilter,
                    state.vaultContext,
                    true
                );
            }
        }
    );

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
        clearUserRsaPrivateKey();
        organizationStore.clear();
        cachedSkPromise = null;
        newVaultItemUnsubscribe();
        categoryFilterUnsubscriber();
        allVaultItemsUnsubscriber();
        organizationStoreUnsubscriber();
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
