<script lang="ts">
    import Icon from "@iconify/svelte";
    import {
        allVaultItemsStore,
        categoryFilter,
        isPasswordGeneratorOpen,
    } from "$lib/stores";
    import { CipherCategory, CipherType, VaultStatus } from "$lib/types";

    let {
        onSelectCategory = undefined,
    }: {
        onSelectCategory?: (() => void) | undefined;
    } = $props();

    const counts = $derived.by(() => {
        const items = $allVaultItemsStore;
        const active = items.filter((i) => i.status === VaultStatus.ACTIVE);
        return {
            all: active.length,
            favorites: active.filter((i) => i.isFavorite).length,
            logins: active.filter((i) => i.type === CipherType.LOGIN).length,
            cards: active.filter((i) => i.type === CipherType.CARD).length,
            databases: active.filter((i) => i.type === CipherType.DATABASE).length,
            notes: active.filter((i) => i.type === CipherType.SECURE_NOTE).length,
            archives: items.filter((i) => i.status === VaultStatus.ARCHIVED).length,
            deleted: items.filter((i) => i.status === VaultStatus.DELETED).length,
        };
    });

    function selectCat(cat: CipherCategory) {
        $categoryFilter = cat;
        onSelectCategory?.();
    }

    const primaryLinks = $derived([
        {
            id: CipherCategory.All,
            label: "All Items",
            icon: "hugeicons:grid-view",
            count: counts.all,
        },
        {
            id: CipherCategory.FAVORITES,
            label: "Favorites",
            icon: "hugeicons:star",
            count: counts.favorites,
        },
        {
            id: CipherCategory.WATCHTOWER,
            label: "Watchtower",
            icon: "hugeicons:shield-01",
            badge: "Audit",
        },
    ]);

    const categoryLinks = $derived([
        {
            id: CipherCategory.LOGINS,
            label: "Logins",
            icon: "hugeicons:login-method",
            count: counts.logins,
            dotClass: "bg-indigo-500",
        },
        {
            id: CipherCategory.CARDS,
            label: "Cards",
            icon: "hugeicons:credit-card",
            count: counts.cards,
            dotClass: "bg-emerald-500",
        },
        {
            id: CipherCategory.DATABASES,
            label: "Databases",
            icon: "hugeicons:database",
            count: counts.databases,
            dotClass: "bg-purple-500",
        },
        {
            id: CipherCategory.SECURE_NOTES,
            label: "Secure Notes",
            icon: "hugeicons:notebook",
            count: counts.notes,
            dotClass: "bg-amber-500",
        },
    ]);

    const lifecycleLinks = $derived([
        {
            id: CipherCategory.ARCHIVES,
            label: "Archives",
            icon: "hugeicons:archive",
            count: counts.archives,
        },
        {
            id: CipherCategory.RECENTLY_DELETED,
            label: "Recently Deleted",
            icon: "hugeicons:delete-02",
            count: counts.deleted,
        },
    ]);
</script>

<aside class="flex h-full w-full flex-col justify-between bg-slate-100/80 dark:bg-slate-900/90 border-r border-slate-200/80 dark:border-slate-800/80 select-none">
    <div class="flex-1 overflow-y-auto px-3 py-4">
        <!-- Brand Header -->
        <div class="mb-5 flex items-center justify-between px-2.5">
            <div class="flex items-center gap-2.5">
                <div class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs shadow-indigo-500/30">
                    <Icon icon="hugeicons:shield-key" width="18" height="18" />
                </div>
                <div>
                    <div class="text-sm font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                        MellonPass
                    </div>
                    <div class="mt-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                        Unlocked • E2EE
                    </div>
                </div>
            </div>
        </div>

        <!-- Primary Navigation -->
        <nav class="space-y-0.5" aria-label="Primary Vault Filters">
            {#each primaryLinks as item (item.id)}
                {@const isActive = $categoryFilter === item.id}
                <button
                    type="button"
                    onclick={() => selectCat(item.id)}
                    class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all cursor-pointer {isActive
                        ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/70'}"
                >
                    <div class="flex items-center gap-2.5">
                        <Icon icon={item.icon} width="18" height="18" class={isActive ? "text-white" : "text-slate-500 dark:text-slate-400"} />
                        <span>{item.label}</span>
                    </div>
                    {#if item.badge}
                        <span
                            class="rounded-full px-2 py-0.5 text-[10px] font-semibold {isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300'}"
                        >
                            {item.badge}
                        </span>
                    {:else if item.count !== undefined && item.count > 0}
                        <span
                            class="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold {isActive
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}"
                        >
                            {item.count}
                        </span>
                    {/if}
                </button>
            {/each}
        </nav>

        <!-- Categories Section -->
        <div class="mt-6">
            <div class="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Vault Categories
            </div>
            <nav class="space-y-0.5" aria-label="Vault Item Categories">
                {#each categoryLinks as item (item.id)}
                    {@const isActive = $categoryFilter === item.id}
                    <button
                        type="button"
                        onclick={() => selectCat(item.id)}
                        class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all cursor-pointer {isActive
                            ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/70'}"
                    >
                        <div class="flex items-center gap-2.5">
                            <Icon icon={item.icon} width="18" height="18" class={isActive ? "text-white" : "text-slate-500 dark:text-slate-400"} />
                            <span>{item.label}</span>
                        </div>
                        {#if item.count > 0}
                            <span
                                class="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold {isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}"
                            >
                                {item.count}
                            </span>
                        {/if}
                    </button>
                {/each}
            </nav>
        </div>

        <!-- Lifecycle Section -->
        <div class="mt-6">
            <div class="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Lifecycle
            </div>
            <nav class="space-y-0.5" aria-label="Archives and Trash">
                {#each lifecycleLinks as item (item.id)}
                    {@const isActive = $categoryFilter === item.id}
                    <button
                        type="button"
                        onclick={() => selectCat(item.id)}
                        class="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs font-medium transition-all cursor-pointer {isActive
                            ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800/70'}"
                    >
                        <div class="flex items-center gap-2.5">
                            <Icon icon={item.icon} width="18" height="18" class={isActive ? "text-white" : "text-slate-500 dark:text-slate-400"} />
                            <span>{item.label}</span>
                        </div>
                        {#if item.count > 0}
                            <span
                                class="rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold {isActive
                                    ? 'bg-white/20 text-white'
                                    : 'bg-slate-200/80 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}"
                            >
                                {item.count}
                            </span>
                        {/if}
                    </button>
                {/each}
            </nav>
        </div>
    </div>

    <!-- Bottom Quick Tool -->
    <div class="border-t border-slate-200/80 dark:border-slate-800/80 p-3">
        <button
            type="button"
            onclick={() => {
                $isPasswordGeneratorOpen = true;
                onSelectCategory?.();
            }}
            class="flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-500/40 transition-all shadow-2xs cursor-pointer"
        >
            <div class="flex items-center gap-2">
                <Icon icon="hugeicons:magic-wand-01" width="16" height="16" class="text-indigo-500" />
                <span>Password Generator</span>
            </div>
            <Icon icon="hugeicons:arrow-up-right-01" width="14" height="14" class="text-slate-400" />
        </button>
    </div>
</aside>
