<script lang="ts">
    import { Dialog } from "bits-ui";
    import Icon from "@iconify/svelte";
    import {
        activeAddModal,
        allVaultItemsStore,
        categoryFilter,
        isCommandPaletteOpen,
        isPasswordGeneratorOpen,
        selectedVaultItem,
    } from "$lib/stores";
    import { CipherCategory, VaultStatus, type VaultItem } from "$lib/types";
    import { theme } from "$lib/theme.svelte";
    import ItemAvatar from "$components/ui/ItemAvatar.svelte";

    let {
        onLockVault,
    }: {
        onLockVault?: () => void;
    } = $props();

    let query = $state("");
    let selectedIndex = $state(0);

    const activeItems = $derived(
        $allVaultItemsStore.filter((item) => item.status === VaultStatus.ACTIVE)
    );

    const matchingItems = $derived.by(() => {
        const q = query.trim().toLowerCase();
        if (!q) return activeItems.slice(0, 6);
        return activeItems
            .filter(
                (item) =>
                    item.name.toLowerCase().includes(q) ||
                    (item.content && item.content.toLowerCase().includes(q))
            )
            .slice(0, 8);
    });

    const quickActions = [
        {
            id: "new-login",
            label: "Create New Login",
            icon: "hugeicons:login-method",
            shortcut: "N L",
            action: () => {
                $isCommandPaletteOpen = false;
                $activeAddModal = "login";
            },
        },
        {
            id: "new-card",
            label: "Create New Credit Card",
            icon: "hugeicons:credit-card",
            shortcut: "N C",
            action: () => {
                $isCommandPaletteOpen = false;
                $activeAddModal = "card";
            },
        },
        {
            id: "new-db",
            label: "Create New Database",
            icon: "hugeicons:database",
            shortcut: "N D",
            action: () => {
                $isCommandPaletteOpen = false;
                $activeAddModal = "database";
            },
        },
        {
            id: "new-note",
            label: "Create New Secure Note",
            icon: "hugeicons:notebook",
            shortcut: "N S",
            action: () => {
                $isCommandPaletteOpen = false;
                $activeAddModal = "secureNote";
            },
        },
        {
            id: "generator",
            label: "Open Password Generator",
            icon: "hugeicons:magic-wand-01",
            shortcut: "⌘ G",
            action: () => {
                $isCommandPaletteOpen = false;
                $isPasswordGeneratorOpen = true;
            },
        },
        {
            id: "watchtower",
            label: "Open Vault Watchtower (Security Audit)",
            icon: "hugeicons:shield-01",
            shortcut: "⌘ W",
            action: () => {
                $isCommandPaletteOpen = false;
                $categoryFilter = CipherCategory.WATCHTOWER;
            },
        },
        {
            id: "theme",
            label: "Toggle Daylight / Obsidian Dark Theme",
            icon: "hugeicons:moon-02",
            shortcut: "⌘ J",
            action: () => {
                theme.toggle();
                $isCommandPaletteOpen = false;
            },
        },
        {
            id: "lock",
            label: "Lock Vault Immediately",
            icon: "hugeicons:square-lock-02",
            shortcut: "⌘ L",
            action: () => {
                $isCommandPaletteOpen = false;
                onLockVault?.();
            },
        },
    ];

    const filteredActions = $derived.by(() => {
        const q = query.trim().toLowerCase();
        if (!q) return quickActions;
        return quickActions.filter((a) => a.label.toLowerCase().includes(q));
    });

    function selectVaultItemFromPalette(item: VaultItem) {
        $categoryFilter = CipherCategory.All;
        $selectedVaultItem = item;
        $isCommandPaletteOpen = false;
        query = "";
    }

    function handleKeydown(e: KeyboardEvent) {
        const total = matchingItems.length + filteredActions.length;
        if (total === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            selectedIndex = (selectedIndex + 1) % total;
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            selectedIndex = (selectedIndex - 1 + total) % total;
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectedIndex < matchingItems.length) {
                selectVaultItemFromPalette(matchingItems[selectedIndex]);
            } else {
                const actionIdx = selectedIndex - matchingItems.length;
                filteredActions[actionIdx]?.action();
            }
        }
    }

    $effect(() => {
        if ($isCommandPaletteOpen) {
            selectedIndex = 0;
        } else {
            query = "";
        }
    });
</script>

<Dialog.Root bind:open={$isCommandPaletteOpen}>
    <Dialog.Portal>
        <Dialog.Overlay
            class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        />
        <Dialog.Content
            onkeydown={handleKeydown}
            class="fixed left-1/2 top-[15%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl focus:outline-none"
        >
            <Dialog.Title class="sr-only">Command Palette</Dialog.Title>
            <Dialog.Description class="sr-only">
                Search vault items and execute quick actions
            </Dialog.Description>

            <!-- Search Input -->
            <div class="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 px-4 py-3.5">
                <Icon
                    icon="hugeicons:search-01"
                    width="20"
                    height="20"
                    class="text-slate-400"
                />
                <!-- svelte-ignore a11y_autofocus -->
                <input
                    type="text"
                    autofocus
                    bind:value={query}
                    oninput={() => (selectedIndex = 0)}
                    placeholder="Search vault items, usernames, hosts, or type a command..."
                    class="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
                <kbd
                    class="hidden sm:inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 dark:text-slate-400"
                >
                    ESC
                </kbd>
            </div>

            <div class="max-h-[60vh] overflow-y-auto p-2">
                {#if matchingItems.length > 0}
                    <div class="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Vault Items
                    </div>
                    <div class="space-y-0.5">
                        {#each matchingItems as item, idx (item.id)}
                            <button
                                type="button"
                                onclick={() => selectVaultItemFromPalette(item)}
                                onmouseenter={() => (selectedIndex = idx)}
                                class="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition-colors cursor-pointer {selectedIndex === idx
                                    ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-100'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}"
                            >
                                <div class="flex items-center gap-3 min-w-0">
                                    <ItemAvatar
                                        type={item.type}
                                        name={item.name}
                                        subtitle={item.content}
                                        size="sm"
                                    />
                                    <div class="min-w-0">
                                        <div class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                                            {item.name}
                                        </div>
                                        {#if item.content}
                                            <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                                                {item.content}
                                            </div>
                                        {/if}
                                    </div>
                                </div>
                                <span class="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                                    Open ↵
                                </span>
                            </button>
                        {/each}
                    </div>
                {/if}

                {#if filteredActions.length > 0}
                    <div class="mt-2 px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Quick Actions
                    </div>
                    <div class="space-y-0.5">
                        {#each filteredActions as act, i (act.id)}
                            {@const globalIdx = matchingItems.length + i}
                            <button
                                type="button"
                                onclick={act.action}
                                onmouseenter={() => (selectedIndex = globalIdx)}
                                class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer {selectedIndex === globalIdx
                                    ? 'bg-indigo-50 text-indigo-900 dark:bg-indigo-500/15 dark:text-indigo-100'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'}"
                            >
                                <div class="flex items-center gap-3">
                                    <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                        <Icon icon={act.icon} width="16" height="16" />
                                    </div>
                                    <span class="text-sm font-medium">{act.label}</span>
                                </div>
                                <kbd class="rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                                    {act.shortcut}
                                </kbd>
                            </button>
                        {/each}
                    </div>
                {/if}

                {#if matchingItems.length === 0 && filteredActions.length === 0}
                    <div class="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        No matching items or commands found for "{query}".
                    </div>
                {/if}
            </div>

            <div class="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                <div class="flex items-center gap-3">
                    <span><strong class="font-mono">↑↓</strong> Navigate</span>
                    <span><strong class="font-mono">↵</strong> Select</span>
                </div>
                <span>MellonPass Command Bar</span>
            </div>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
