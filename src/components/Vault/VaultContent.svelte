<script lang="ts">
    import Icon from "@iconify/svelte";
    import { DropdownMenu } from "bits-ui";
    import { getContext, onMount } from "svelte";

    import VaultCardDetail from "$components/Vault/types/Card/VaultCardDetail.svelte";
    import VaultCardEdit from "$components/Vault/types/Card/VaultCardEdit.svelte";
    import VaultLoginDetail from "$components/Vault/types/Login/VaultLoginDetail.svelte";
    import VaultLoginEdit from "$components/Vault/types/Login/VaultLoginEdit.svelte";
    import VaultSecureNoteEdit from "$components/Vault/types/SecureNote/VaultSecureNoteEdit.svelte";
    import VaultSecureNoteDetail from "$components/Vault/types/SecureNote/VaultSecureNoteDetail.svelte";
    import VaultDatabaseDetail from "$components/Vault/types/Database/VaultDatabaseDetail.svelte";
    import VaultDatabaseEdit from "$components/Vault/types/Database/VaultDatabaseEdit.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import {
        restoreCipherFromDelete,
        updateCipher,
        updateCipherToDelete,
    } from "$lib/services/ciphers";
    import { categoryFilter, cipherStore, selectedVaultItem } from "$lib/stores";
    import {
        CipherCategory,
        VaultStatus,
        type CipherData,
        type VaultItemDetail,
    } from "$lib/types";
    import {
        encryptVaultDetailForUpdate,
        handleCipherResponse,
        loadVaultItemDetailFromStore,
    } from "$lib/vaults";
    import { toast } from "$lib/toast.svelte";

    import type { SymmetricKey } from "$lib/models/keys";

    let {
        onBackToList = undefined,
    }: {
        onBackToList?: (() => void) | undefined;
    } = $props();

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");
    let sk: SymmetricKey | null = $state(null);

    const VAULT_MAPPER: { [key: string]: { [key: string]: any } } = {
        LOGIN: {
            details: VaultLoginDetail,
            edit: VaultLoginEdit,
        },
        SECURE_NOTE: {
            details: VaultSecureNoteDetail,
            edit: VaultSecureNoteEdit,
        },
        CARD: {
            details: VaultCardDetail,
            edit: VaultCardEdit,
        },
        DATABASE: {
            details: VaultDatabaseDetail,
            edit: VaultDatabaseEdit,
        },
    };

    let isEditMode = $state(false);
    let formErrors: Array<string> = $state([]);
    let vaultItemDetail: VaultItemDetail<CipherData> | null = $state(null);

    let VaultComponent = $derived.by(() => {
        if ($selectedVaultItem) {
            const component = VAULT_MAPPER[$selectedVaultItem.type];
            return isEditMode ? component.edit : component.details;
        }
    });

    const daysUntilPermanentDeletion = $derived.by(() => {
        if (!vaultItemDetail?.deleteOn) return 30;
        const diffMs =
            new Date(vaultItemDetail.deleteOn).getTime() - Date.now();
        return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    });

    const updateFavorite = async () => {
        if (!vaultItemDetail || !sk) return;
        vaultItemDetail.isFavorite = !vaultItemDetail.isFavorite;

        const cipher = await encryptVaultDetailForUpdate({
            vaultDetail: vaultItemDetail,
            sk: sk,
        });
        const response = await updateCipher(cipher);

        vaultItemDetail = await handleCipherResponse(
            response.data.cipher.update,
            sk
        );

        toast.show({
            title: vaultItemDetail.isFavorite
                ? "Added to Favorites"
                : "Removed from Favorites",
            variant: "success",
            durationMs: 2500,
        });
    };

    const updateStatus = async (status: VaultStatus) => {
        if (!vaultItemDetail || !sk) return;
        // Preserve previous status BEFORE mutating vaultItemDetail.status
        const previousStatus = vaultItemDetail.status;
        vaultItemDetail.status = status;

        const cipher = await encryptVaultDetailForUpdate({
            vaultDetail: vaultItemDetail,
            sk: sk,
        });

        switch (status) {
            case VaultStatus.ACTIVE: {
                if (previousStatus === VaultStatus.ARCHIVED) {
                    const response = await updateCipher(cipher);
                    vaultItemDetail = await handleCipherResponse(
                        response.data.cipher.update,
                        sk
                    );
                } else {
                    const response = await restoreCipherFromDelete(cipher);
                    vaultItemDetail = await handleCipherResponse(
                        response.data.cipher.restoreCipherFromDelete,
                        sk
                    );
                }
                toast.show({
                    title: "Item restored to active vault",
                    variant: "success",
                });
                $categoryFilter = CipherCategory.All;
                break;
            }
            case VaultStatus.ARCHIVED: {
                const response = await updateCipher(cipher);
                vaultItemDetail = await handleCipherResponse(
                    response.data.cipher.update,
                    sk
                );
                toast.show({
                    title: "Item moved to Archives",
                    variant: "default",
                });
                $categoryFilter = CipherCategory.ARCHIVES;
                break;
            }
            case VaultStatus.DELETED: {
                const response = await updateCipherToDelete(cipher);
                vaultItemDetail = await handleCipherResponse(
                    response.data.cipher.updateToDelete,
                    sk
                );
                toast.show({
                    title: "Item moved to Recently Deleted",
                    variant: "warning",
                });
                $categoryFilter = CipherCategory.RECENTLY_DELETED;
                break;
            }
            default:
                break;
        }
    };

    onMount(async () => {
        sk = await extractSymmetricKey(mk, epsk);
        vaultItemDetail = await loadVaultItemDetailFromStore(
            $selectedVaultItem!.id,
            sk
        );
    });

    $effect(() => {
        const editing = isEditMode;
        const ciphers = $cipherStore;
        const selectedId = $selectedVaultItem?.id;
        if (!editing && sk && selectedId && ciphers.length > 0) {
            loadVaultItemDetailFromStore(selectedId, sk).then((detail) => {
                vaultItemDetail = detail;
            });
        }
    });
</script>

{#if vaultItemDetail}
    <!-- Top Action Toolbar -->
    <div
        class="flex h-13 shrink-0 items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 {isEditMode
            ? 'bg-indigo-50/60 dark:bg-indigo-950/20'
            : 'bg-white/60 dark:bg-slate-900/40'}"
    >
        <div class="flex items-center gap-2">
            {#if onBackToList}
                <button
                    type="button"
                    onclick={onBackToList}
                    class="inline-flex md:hidden items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                    <Icon icon="hugeicons:arrow-left-01" width="16" height="16" />
                    <span>Back</span>
                </button>
            {/if}

            {#if isEditMode}
                <span class="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                    <Icon icon="hugeicons:pencil-edit-02" width="14" height="14" />
                    Editing Item
                </span>
            {/if}
        </div>

        {#if isEditMode}
            <div class="flex items-center gap-2">
                <button
                    type="button"
                    onclick={() => {
                        isEditMode = false;
                        formErrors = [];
                    }}
                    class="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                >
                    Cancel
                </button>
                <button
                    form="vault-form"
                    type="submit"
                    class="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs shadow-indigo-500/20 transition-colors cursor-pointer"
                >
                    <Icon icon="hugeicons:tick-02" width="15" height="15" />
                    Save Changes
                </button>
            </div>
        {:else}
            <div class="flex items-center gap-2">
                {#if vaultItemDetail.status === VaultStatus.ACTIVE}
                    <button
                        type="button"
                        onclick={updateFavorite}
                        title={vaultItemDetail.isFavorite
                            ? "Remove from Favorites"
                            : "Add to Favorites"}
                        aria-label="Toggle favorite"
                        class="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer {vaultItemDetail.isFavorite
                            ? 'text-amber-400'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}"
                    >
                        <Icon icon="hugeicons:star" width="16" height="16" />
                    </button>
                {/if}

                {#if vaultItemDetail.status !== VaultStatus.DELETED}
                    <button
                        type="button"
                        onclick={() => {
                            isEditMode = true;
                            formErrors = [];
                        }}
                        class="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 px-3 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                        <Icon icon="hugeicons:pencil-edit-02" width="14" height="14" />
                        <span>Edit</span>
                    </button>
                {/if}

                {#if vaultItemDetail.status === VaultStatus.ACTIVE}
                    <DropdownMenu.Root>
                        <DropdownMenu.Trigger
                            aria-label="More item actions"
                            class="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer focus:outline-none"
                        >
                            <Icon
                                icon="hugeicons:more-vertical-circle-01"
                                width="17"
                                height="17"
                            />
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                            <DropdownMenu.Content
                                sideOffset={6}
                                align="end"
                                class="z-50 w-48 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-xl focus:outline-none"
                            >
                                <DropdownMenu.Item
                                    onSelect={updateFavorite}
                                    class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
                                >
                                    <Icon
                                        icon="hugeicons:star"
                                        width="16"
                                        height="16"
                                        class={vaultItemDetail.isFavorite
                                            ? "text-amber-400"
                                            : "text-slate-400"}
                                    />
                                    <span>
                                        {vaultItemDetail.isFavorite
                                            ? "Remove Favorite"
                                            : "Add to Favorites"}
                                    </span>
                                </DropdownMenu.Item>

                                <DropdownMenu.Separator class="my-1 h-px bg-slate-100 dark:bg-slate-800" />

                                <DropdownMenu.Item
                                    onSelect={() => updateStatus(VaultStatus.ARCHIVED)}
                                    class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer focus:outline-none"
                                >
                                    <Icon
                                        icon="hugeicons:archive"
                                        width="16"
                                        height="16"
                                        class="text-slate-400"
                                    />
                                    <span>Archive Item</span>
                                </DropdownMenu.Item>

                                <DropdownMenu.Item
                                    onSelect={() => updateStatus(VaultStatus.DELETED)}
                                    class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 cursor-pointer focus:outline-none"
                                >
                                    <Icon
                                        icon="hugeicons:delete-02"
                                        width="16"
                                        height="16"
                                    />
                                    <span>Move to Trash</span>
                                </DropdownMenu.Item>
                            </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                {:else}
                    <button
                        type="button"
                        onclick={() => updateStatus(VaultStatus.ACTIVE)}
                        class="inline-flex h-8 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                    >
                        <Icon icon="hugeicons:restore-bin" width="14" height="14" />
                        <span>Restore Item</span>
                    </button>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Vault Content Display -->
<div class="flex-1 overflow-y-auto">
    {#key isEditMode}
        <div class="mx-auto w-full max-w-3xl pb-12">
            {#if vaultItemDetail}
                {#if vaultItemDetail.status === VaultStatus.ARCHIVED}
                    <div
                        role="alert"
                        class="mx-4 sm:mx-6 mt-4 flex items-center gap-2.5 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-xs font-medium text-amber-800 dark:text-amber-300"
                    >
                        <Icon icon="hugeicons:archive" width="16" height="16" class="shrink-0" />
                        <span>This item is archived and hidden from your primary vault list.</span>
                    </div>
                {/if}

                {#if vaultItemDetail.status === VaultStatus.DELETED}
                    <div
                        role="alert"
                        class="mx-4 sm:mx-6 mt-4 flex items-center justify-between gap-3 rounded-xl border border-rose-200 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-800 dark:text-rose-300"
                    >
                        <div class="flex items-center gap-2.5">
                            <Icon icon="hugeicons:delete-02" width="16" height="16" class="shrink-0 text-rose-500" />
                            <span>
                                This item is in Trash and scheduled for permanent deletion in <strong>{daysUntilPermanentDeletion} day{daysUntilPermanentDeletion === 1 ? "" : "s"}</strong>.
                            </span>
                        </div>
                    </div>
                {/if}
            {/if}

            <div class="px-4 sm:px-6 pt-4">
                <VaultComponent
                    formId="vault-form"
                    vaultId={$selectedVaultItem!.id}
                    bind:isEditMode
                />
            </div>
        </div>
    {/key}
</div>
