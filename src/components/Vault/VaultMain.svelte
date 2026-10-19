<script lang="ts">
    import { PUBLIC_DEMO_MODE } from "$env/static/public";
    import { onDestroy, onMount } from "svelte";
    import Icon from "@iconify/svelte";

    import VaultContent from "$components/Vault/VaultContent.svelte";
    import VaultNavbar from "$components/Vault/VaultNavbar.svelte";
    import VaultSideNav from "$components/Vault/VaultSideNav.svelte";
    import VaultWatchtower from "$components/Vault/VaultWatchtower.svelte";
    import CommandPalette from "$components/Vault/CommandPalette.svelte";
    import PasswordGeneratorModal from "$components/ui/PasswordGeneratorModal.svelte";
    import ItemAvatar from "$components/ui/ItemAvatar.svelte";

    import {
        activeAddModal,
        categoryFilter,
        isCommandPaletteOpen,
        isPasswordGeneratorOpen,
        searchFilter,
        selectedVaultItem,
        vaultItemStore,
    } from "$lib/stores";
    import { CipherCategory, type VaultItem } from "$lib/types";
    import { theme } from "$lib/theme.svelte";

    let {
        isLoadingVault = false,
        onLockVault = undefined,
    }: {
        isLoadingVault?: boolean;
        onLockVault?: (() => void) | undefined;
    } = $props();

    let vaultItems: Array<VaultItem> = $state([]);
    let demoBannerDismissed = $state(false);
    let mobileNavOpen = $state(false);
    let mobileDetailOpen = $state(false);

    const categoryLabels: Record<CipherCategory, string> = {
        [CipherCategory.All]: "All Items",
        [CipherCategory.FAVORITES]: "Favorites",
        [CipherCategory.LOGINS]: "Logins",
        [CipherCategory.CARDS]: "Payment Cards",
        [CipherCategory.DATABASES]: "Databases",
        [CipherCategory.SECURE_NOTES]: "Secure Notes",
        [CipherCategory.ARCHIVES]: "Archives",
        [CipherCategory.RECENTLY_DELETED]: "Recently Deleted",
        [CipherCategory.WATCHTOWER]: "Watchtower",
    };

    const selectItem = (vaultItem: VaultItem, openMobile: boolean = false) => {
        if (vaultItem) {
            $selectedVaultItem = vaultItem;
            if (openMobile) {
                mobileDetailOpen = true;
            }
        }
    };

    const filterItems = (items: VaultItem[], query: string | null) => {
        const q = (query ?? "").trim().toLowerCase();
        if (!q) return items;
        return items.filter(
            (item) =>
                item.name.toLowerCase().includes(q) ||
                (item.content && item.content.toLowerCase().includes(q))
        );
    };

    const searchFilterUnsubscribe = searchFilter.subscribe((value) => {
        vaultItems = filterItems($vaultItemStore, value);
        if (vaultItems.length > 0) {
            selectItem(vaultItems[0], false);
        }
    });

    const vaultItemStoreUnsubscribe = vaultItemStore.subscribe((items) => {
        const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
        vaultItems = filterItems(sorted, $searchFilter);

        if (vaultItems.length == 0) {
            $selectedVaultItem = null;
            mobileDetailOpen = false;
        } else {
            setTimeout(() => {
                if ($selectedVaultItem == null) return;
                const focusElement = document.getElementById(
                    `vault-item-${$selectedVaultItem.id}`
                );
                focusElement?.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
            }, 100);
        }
    });

    function handleGlobalKeydown(e: KeyboardEvent) {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            $isCommandPaletteOpen = !$isCommandPaletteOpen;
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "g") {
            e.preventDefault();
            $isPasswordGeneratorOpen = true;
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
            e.preventDefault();
            theme.toggle();
        }
    }

    onMount(() => {
        const max_idle_time = 10; // In minutes
        let idleTime: number = 0;

        const incrementIdleTime = () => {
            idleTime++;
            if (idleTime > max_idle_time) {
                if (onLockVault) {
                    onLockVault();
                } else {
                    window.location.reload();
                }
            }
        };

        function resetIdleTime() {
            idleTime = 0;
        }

        const activityEvents = ["mousemove", "keypress", "touchstart", "click"];
        for (const evt of activityEvents) {
            document.addEventListener(evt, resetIdleTime, { passive: true });
        }
        window.addEventListener("keydown", handleGlobalKeydown);

        const interval = setInterval(() => {
            incrementIdleTime();
        }, 60_000);

        return () => {
            clearInterval(interval);
            for (const evt of activityEvents) {
                document.removeEventListener(evt, resetIdleTime);
            }
            window.removeEventListener("keydown", handleGlobalKeydown);
        };
    });

    onDestroy(() => {
        vaultItemStoreUnsubscribe();
        searchFilterUnsubscribe();
    });
</script>

<div class="flex h-dvh w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
    <!-- Desktop Sidebar (≥ 1024px) -->
    <div class="hidden lg:block w-60 shrink-0 h-full">
        <VaultSideNav />
    </div>

    <!-- Mobile / Tablet Drawer Sidebar (< 1024px) -->
    {#if mobileNavOpen}
        <div class="fixed inset-0 z-50 flex lg:hidden">
            <button
                type="button"
                aria-label="Close navigation drawer"
                onclick={() => (mobileNavOpen = false)}
                class="fixed inset-0 bg-slate-950/50 backdrop-blur-xs"
            ></button>
            <div class="relative z-10 w-64 max-w-[80vw] h-full shadow-2xl">
                <VaultSideNav onSelectCategory={() => {
                    mobileNavOpen = false;
                    mobileDetailOpen = false;
                }} />
            </div>
        </div>
    {/if}

    <!-- Main Content Column -->
    <div class="flex flex-1 flex-col min-w-0 h-full overflow-hidden">
        {#if PUBLIC_DEMO_MODE === "true" && !demoBannerDismissed}
            <div
                role="alert"
                class="flex items-center justify-between gap-3 bg-rose-600 px-4 py-2 text-xs font-medium text-white"
            >
                <div class="flex items-center gap-2 mx-auto">
                    <Icon icon="hugeicons:alert-02" width="16" height="16" />
                    <span>
                        <strong>Demo Mode:</strong> Do not store real production passwords in this environment.
                    </span>
                </div>
                <button
                    type="button"
                    aria-label="Dismiss demo warning"
                    onclick={() => (demoBannerDismissed = true)}
                    class="rounded p-0.5 hover:bg-white/20 cursor-pointer"
                >
                    <Icon icon="hugeicons:cancel-01" width="14" height="14" />
                </button>
            </div>
        {/if}

        <VaultNavbar
            onToggleMobileNav={() => (mobileNavOpen = !mobileNavOpen)}
            {onLockVault}
        />

        {#if $categoryFilter === CipherCategory.WATCHTOWER}
            <div class="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950">
                <VaultWatchtower />
            </div>
        {:else}
            <div class="flex flex-1 min-h-0 overflow-hidden">
                <!-- Pane 2: Item List -->
                <div
                    class="flex flex-col h-full w-full md:w-80 shrink-0 border-r border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 {mobileDetailOpen && $selectedVaultItem
                        ? 'hidden md:flex'
                        : 'flex'}"
                >
                    <!-- List Header -->
                    <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/70 px-4 py-2.5">
                        <span class="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {categoryLabels[$categoryFilter] ?? "Vault Items"}
                        </span>
                        <span class="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                            {vaultItems.length}
                        </span>
                    </div>

                    <!-- Scrollable Item List -->
                    <div class="flex-1 overflow-y-auto p-2 space-y-1">
                        {#if isLoadingVault}
                            {#each [1, 2, 3, 4, 5] as _}
                                <div class="flex items-center gap-3 rounded-xl p-2.5 animate-pulse">
                                    <div class="h-10 w-10 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
                                    <div class="flex-1 space-y-2">
                                        <div class="h-3.5 w-2/3 rounded bg-slate-200 dark:bg-slate-800"></div>
                                        <div class="h-2.5 w-1/2 rounded bg-slate-100 dark:bg-slate-800/60"></div>
                                    </div>
                                </div>
                            {/each}
                        {:else if vaultItems.length > 0}
                            {#each vaultItems as item (item.id)}
                                {@const isSelected =
                                    $selectedVaultItem != null &&
                                    item.id === $selectedVaultItem.id}
                                <button
                                    id="vault-item-{item.id}"
                                    type="button"
                                    onclick={() => selectItem(item, true)}
                                    class="group flex w-full items-center justify-between gap-3 rounded-xl p-2.5 text-left transition-all cursor-pointer {isSelected
                                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                                        : 'hover:bg-slate-100/80 dark:hover:bg-slate-800/60 text-slate-900 dark:text-slate-100'}"
                                >
                                    <div class="flex items-center gap-3 min-w-0 flex-1">
                                        <ItemAvatar
                                            type={item.type}
                                            name={item.name}
                                            subtitle={item.content}
                                            selected={isSelected}
                                        />
                                        <div class="min-w-0 flex-1">
                                            <div class="flex items-center gap-1.5">
                                                <span class="truncate text-sm font-semibold">
                                                    {item.name}
                                                </span>
                                                {#if item.isFavorite}
                                                    <Icon
                                                        icon="hugeicons:star"
                                                        width="13"
                                                        height="13"
                                                        class="shrink-0 {isSelected
                                                            ? 'text-amber-300'
                                                            : 'text-amber-400'}"
                                                    />
                                                {/if}
                                            </div>
                                            {#if item.content}
                                                <div
                                                    class="truncate text-xs {isSelected
                                                        ? 'text-indigo-100'
                                                        : 'text-slate-500 dark:text-slate-400'}"
                                                >
                                                    {item.content.indexOf("\n") >= 0
                                                        ? item.content
                                                              .slice(
                                                                  0,
                                                                  item.content.indexOf("\n")
                                                              )
                                                              .slice(0, 32)
                                                        : item.content.slice(0, 32)}
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                </button>
                            {/each}
                        {:else}
                            <div class="flex flex-col items-center justify-center py-14 px-4 text-center">
                                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400">
                                    <Icon icon="hugeicons:folder-02" width="24" height="24" />
                                </div>
                                <p class="mt-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    No items found
                                </p>
                                <p class="mt-1 text-[11px] text-slate-400 dark:text-slate-500 max-w-[14rem]">
                                    {$searchFilter
                                        ? `No matches for "${$searchFilter}".`
                                        : "This folder is currently empty."}
                                </p>
                            </div>
                        {/if}
                    </div>

                    <!-- List Footer -->
                    <div class="border-t border-slate-100 dark:border-slate-800/70 py-2 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
                        {#if vaultItems.length > 0}
                            {vaultItems.length} item{vaultItems.length > 1 ? "s" : ""}
                        {:else}
                            0 items
                        {/if}
                    </div>
                </div>

                <!-- Pane 3: Item Detail / Edit View -->
                <div
                    class="flex-1 h-full overflow-hidden bg-slate-50/70 dark:bg-slate-950 {mobileDetailOpen && $selectedVaultItem
                        ? 'flex flex-col'
                        : 'hidden md:flex md:flex-col'}"
                >
                    {#if $selectedVaultItem}
                        {#key $selectedVaultItem.id}
                            <VaultContent
                                onBackToList={() => (mobileDetailOpen = false)}
                            />
                        {/key}
                    {:else}
                        <!-- Empty / Unselected State -->
                        <div class="flex h-full flex-col items-center justify-center p-8 text-center">
                            <div class="flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border border-indigo-500/20">
                                <Icon icon="hugeicons:shield-key" width="32" height="32" />
                            </div>
                            <h3 class="mt-4 text-base font-bold text-slate-900 dark:text-white">
                                Your Zero-Knowledge Vault
                            </h3>
                            <p class="mt-1 max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                                Select an item from the list to view or edit its encrypted credentials, or create a new vault item below.
                            </p>

                            <div class="mt-6 flex flex-wrap items-center justify-center gap-2">
                                <button
                                    type="button"
                                    onclick={() => ($activeAddModal = "login")}
                                    class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                                >
                                    <Icon icon="hugeicons:login-method" width="15" height="15" />
                                    New Login
                                </button>
                                <button
                                    type="button"
                                    onclick={() => ($activeAddModal = "card")}
                                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                >
                                    <Icon icon="hugeicons:credit-card" width="15" height="15" />
                                    New Card
                                </button>
                                <button
                                    type="button"
                                    onclick={() => ($activeAddModal = "database")}
                                    class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                                >
                                    <Icon icon="hugeicons:database" width="15" height="15" />
                                    New Database
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
        {/if}
    </div>
</div>

<CommandPalette {onLockVault} />
<PasswordGeneratorModal bind:open={$isPasswordGeneratorOpen} />