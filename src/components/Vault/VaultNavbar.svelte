<script lang="ts">
    import gravatar from "gravatar";
    import Icon from "@iconify/svelte";
    import { Dialog, DropdownMenu } from "bits-ui";
    import { invalidateAll } from "$app/navigation";

    import VaultCardAdd from "$components/Vault/types/Card/VaultCardAdd.svelte";
    import VaultLoginAdd from "$components/Vault/types/Login/VaultLoginAdd.svelte";
    import VaultSecureNoteAdd from "$components/Vault/types/SecureNote/VaultSecureNoteAdd.svelte";
    import VaultDatabaseAdd from "$components/Vault/types/Database/VaultDatabaseAdd.svelte";

    import {
        activeAddModal,
        isCommandPaletteOpen,
        isPasswordGeneratorOpen,
        searchFilter,
        type ModalItemType,
    } from "$lib/stores";
    import { logoutAccount } from "$lib/services/accounts";
    import { theme } from "$lib/theme.svelte";

    let {
        onToggleMobileNav,
        onLockVault,
    }: {
        onToggleMobileNav?: () => void;
        onLockVault?: () => void;
    } = $props();

    const ModalMapper: Record<Exclude<ModalItemType, null>, any> = {
        login: VaultLoginAdd,
        secureNote: VaultSecureNoteAdd,
        card: VaultCardAdd,
        database: VaultDatabaseAdd,
    };

    const ModalTitles: Record<Exclude<ModalItemType, null>, { title: string; subtitle: string; icon: string }> = {
        login: {
            title: "New Login",
            subtitle: "Store website credentials and 2FA authenticator key",
            icon: "hugeicons:login-method",
        },
        card: {
            title: "New Payment Card",
            subtitle: "Store credit or debit card details securely",
            icon: "hugeicons:credit-card",
        },
        database: {
            title: "New Database Connection",
            subtitle: "Store connection URL or host parameters",
            icon: "hugeicons:database",
        },
        secureNote: {
            title: "New Secure Note",
            subtitle: "End-to-end encrypted Markdown note",
            icon: "hugeicons:notebook",
        },
    };

    let isModalOpen = $state(false);

    $effect(() => {
        isModalOpen = $activeAddModal !== null;
    });

    function handleModalOpenChange(open: boolean) {
        isModalOpen = open;
        if (!open) {
            $activeAddModal = null;
        }
    }

    function openAddModal(type: Exclude<ModalItemType, null>) {
        $activeAddModal = type;
    }

    function closeAddModal() {
        $activeAddModal = null;
    }

    const ModalComponent = $derived(
        $activeAddModal ? ModalMapper[$activeAddModal] : null
    );
    const activeModalMeta = $derived(
        $activeAddModal ? ModalTitles[$activeAddModal] : null
    );

    const whoamiRaw = localStorage.getItem("whoami");
    const whoami = whoamiRaw ? JSON.parse(whoamiRaw) : { identity: "" };
    const gravatar_url = whoami.identity
        ? gravatar.url(whoami.identity, { s: "100", r: "pg", d: "retro" })
        : "";

    const handleLogout = async () => {
        await logoutAccount();
        invalidateAll();
    };

    const handleLock = () => {
        if (onLockVault) {
            onLockVault();
        } else {
            window.location.assign("/");
        }
    };
</script>

<header class="flex h-15 shrink-0 items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-3 sm:px-5">
    <!-- Left: Mobile Drawer Button + Search Bar -->
    <div class="flex flex-1 items-center gap-2.5 max-w-xl">
        <button
            type="button"
            onclick={() => onToggleMobileNav?.()}
            aria-label="Toggle navigation drawer"
            class="flex lg:hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
            <Icon icon="hugeicons:menu-01" width="18" height="18" />
        </button>

        <div class="relative flex-1">
            <Icon
                icon="hugeicons:search-01"
                width="17"
                height="17"
                class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
                name="search"
                bind:value={$searchFilter}
                type="text"
                placeholder="Search vault..."
                aria-label="Search vault"
                autocomplete="off"
                class="h-9 w-full rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/70 pl-9 pr-16 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            {#if $searchFilter}
                <button
                    type="button"
                    aria-label="Clear search"
                    onclick={() => ($searchFilter = "")}
                    class="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                    <Icon icon="hugeicons:cancel-01" width="14" height="14" />
                </button>
            {:else}
                <button
                    type="button"
                    onclick={() => ($isCommandPaletteOpen = true)}
                    title="Open Command Palette (⌘K)"
                    class="hidden sm:inline-flex items-center gap-0.5 absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                >
                    ⌘K
                </button>
            {/if}
        </div>
    </div>

    <!-- Right Controls -->
    <div class="flex items-center gap-2">
        <!-- Theme Toggle -->
        <button
            type="button"
            onclick={() => theme.toggle()}
            title={theme.mode === "dark" ? "Switch to Daylight mode" : "Switch to Obsidian Dark mode"}
            aria-label="Toggle color theme"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
            <Icon
                icon={theme.mode === "dark" ? "hugeicons:sun-03" : "hugeicons:moon-02"}
                width="17"
                height="17"
            />
        </button>

        <!-- New Item Dropdown (Bits UI) -->
        <DropdownMenu.Root>
            <DropdownMenu.Trigger
                class="inline-flex h-9 items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-3.5 text-xs font-semibold text-white shadow-xs shadow-indigo-500/25 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
                <Icon icon="hugeicons:add-01" width="16" height="16" />
                <span>New Item</span>
                <Icon icon="hugeicons:arrow-down-01" width="14" height="14" class="opacity-80" />
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    sideOffset={8}
                    align="end"
                    class="z-50 w-52 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl focus:outline-none"
                >
                    <div class="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Create Vault Item
                    </div>
                    <DropdownMenu.Item
                        onSelect={() => openAddModal("login")}
                        class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
                    >
                        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Icon icon="hugeicons:login-method" width="16" height="16" />
                        </div>
                        <div>
                            <div class="font-semibold">Login</div>
                            <div class="text-[10px] text-slate-400">Username, password, 2FA</div>
                        </div>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                        onSelect={() => openAddModal("card")}
                        class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
                    >
                        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Icon icon="hugeicons:credit-card" width="16" height="16" />
                        </div>
                        <div>
                            <div class="font-semibold">Payment Card</div>
                            <div class="text-[10px] text-slate-400">Credit or debit card</div>
                        </div>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                        onSelect={() => openAddModal("database")}
                        class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
                    >
                        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Icon icon="hugeicons:database" width="16" height="16" />
                        </div>
                        <div>
                            <div class="font-semibold">Database</div>
                            <div class="text-[10px] text-slate-400">Connection URI & params</div>
                        </div>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                        onSelect={() => openAddModal("secureNote")}
                        class="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
                    >
                        <div class="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Icon icon="hugeicons:notebook" width="16" height="16" />
                        </div>
                        <div>
                            <div class="font-semibold">Secure Note</div>
                            <div class="text-[10px] text-slate-400">Encrypted Markdown note</div>
                        </div>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <!-- Profile Menu Dropdown (Bits UI) -->
        <DropdownMenu.Root>
            <DropdownMenu.Trigger
                aria-label="Account menu"
                class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden hover:ring-2 hover:ring-indigo-500/30 transition-all cursor-pointer focus:outline-none"
            >
                <img
                    alt="User avatar"
                    class="h-full w-full object-cover"
                    src={gravatar_url}
                    width="36"
                    height="36"
                />
            </DropdownMenu.Trigger>

            <DropdownMenu.Portal>
                <DropdownMenu.Content
                    sideOffset={8}
                    align="end"
                    class="z-50 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl focus:outline-none"
                >
                    <div class="flex items-center gap-3 px-3 py-2.5">
                        <img
                            alt="User avatar"
                            class="h-9 w-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                            src={gravatar_url}
                        />
                        <div class="min-w-0 flex-1">
                            <div class="text-[11px] font-medium text-slate-400">
                                Signed in as
                            </div>
                            <div class="truncate text-xs font-semibold text-slate-900 dark:text-white">
                                {whoami.identity}
                            </div>
                        </div>
                    </div>

                    <DropdownMenu.Separator class="my-1 h-px bg-slate-100 dark:bg-slate-800" />

                    <DropdownMenu.Item
                        onSelect={() => ($isCommandPaletteOpen = true)}
                        class="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
                    >
                        <div class="flex items-center gap-2.5">
                            <Icon icon="hugeicons:command" width="16" height="16" class="text-slate-400" />
                            <span>Command Palette</span>
                        </div>
                        <kbd class="font-mono text-[10px] text-slate-400">⌘K</kbd>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                        onSelect={() => ($isPasswordGeneratorOpen = true)}
                        class="flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
                    >
                        <div class="flex items-center gap-2.5">
                            <Icon icon="hugeicons:magic-wand-01" width="16" height="16" class="text-slate-400" />
                            <span>Password Generator</span>
                        </div>
                    </DropdownMenu.Item>

                    <DropdownMenu.Separator class="my-1 h-px bg-slate-100 dark:bg-slate-800" />

                    <DropdownMenu.Item
                        onSelect={handleLock}
                        class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
                    >
                        <Icon icon="hugeicons:square-lock-02" width="16" height="16" class="text-slate-400" />
                        <span>Lock Vault Now</span>
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                        onSelect={handleLogout}
                        class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer focus:outline-none"
                    >
                        <Icon icon="hugeicons:logout-01" width="16" height="16" />
                        <span>Logout</span>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    </div>
</header>

<!-- Declarative Add Item Modal (Bits UI Dialog) -->
<Dialog.Root open={isModalOpen} onOpenChange={handleModalOpenChange}>
    <Dialog.Portal>
        <Dialog.Overlay
            class="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        />
        <Dialog.Content
            class="fixed left-1/2 top-1/2 z-50 w-full max-w-lg max-h-[90vh] -translate-x-1/2 -translate-y-1/2 flex flex-col overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl focus:outline-none"
        >
            {#if activeModalMeta}
                <div class="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                            <Icon icon={activeModalMeta.icon} width="20" height="20" />
                        </div>
                        <div>
                            <Dialog.Title class="text-base font-bold text-slate-900 dark:text-white">
                                {activeModalMeta.title}
                            </Dialog.Title>
                            <Dialog.Description class="text-xs text-slate-500 dark:text-slate-400">
                                {activeModalMeta.subtitle}
                            </Dialog.Description>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="Close modal"
                        onclick={closeAddModal}
                        class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                        <Icon icon="hugeicons:cancel-01" width="18" height="18" />
                    </button>
                </div>
            {/if}

            {#if ModalComponent}
                {#key $activeAddModal}
                    <ModalComponent onClose={closeAddModal} />
                {/key}
            {/if}
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
