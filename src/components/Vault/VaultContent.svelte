<script lang="ts">
    import Icon from "@iconify/svelte";

    import { getContext, onMount } from "svelte";

    import VaultCardDetail from "$components/Vault/types/Card/VaultCardDetail.svelte";
    import VaultCardEdit from "$components/Vault/types/Card/VaultCardEdit.svelte";
    import VaultLoginDetail from "$components/Vault/types/Login/VaultLoginDetail.svelte";
    import VaultLoginEdit from "$components/Vault/types/Login/VaultLoginEdit.svelte";
    import VaultSecureNoteEdit from "$components/Vault/types/SecureNote//VaultSecureNoteEdit.svelte";
    import VaultSecureNoteDetail from "$components/Vault/types/SecureNote/VaultSecureNoteDetail.svelte";

    import { extractSymmetricKey } from "$lib/key-generation";
    import { restoreCipherFromDelete, updateCipher, updateCipherToDelete } from "$lib/services/ciphers";
    import { categoryFilter, selectedVaultItem } from "$lib/stores";
    import { CipherCategory, VaultStatus, type CipherData, type VaultItemDetail } from "$lib/types";
    import { encryptVaultDetailForUpdate, handleCipherResponse, loadVaultItemDetailFromStore } from "$lib/vaults";

    import type { SymmetricKey } from "$lib/models/keys";

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");
    let sk: SymmetricKey | null = $state(null);

    const VAULT_MAPPER: { [key: string]: { [key: string]: any } } = {
        "LOGIN": {
            "details": VaultLoginDetail,
            "edit": VaultLoginEdit,
        },
        "SECURE_NOTE": {
            "details": VaultSecureNoteDetail,
            "edit": VaultSecureNoteEdit,
        },
        "CARD": {
            "details": VaultCardDetail,
            "edit": VaultCardEdit
        }
    };

    let isEditMode = $state(false);
    let formErrors: Array<string> = $state([]);
    let vaultItemDetail: VaultItemDetail<CipherData> | null = $state(null);

    let VaultComponent = $derived.by(() => {
        if ($selectedVaultItem) {
            let component = VAULT_MAPPER[$selectedVaultItem.type];
            return isEditMode ? component.edit : component.details;
        }
    });

    const updateFavorite = async () => {
        vaultItemDetail!.isFavorite = !vaultItemDetail!.isFavorite;

        const cipher = await encryptVaultDetailForUpdate({vaultDetail: vaultItemDetail!, sk: sk!})
        const response = await updateCipher(cipher);

        vaultItemDetail = await handleCipherResponse(response.data.cipher.update, sk!);

        if (vaultItemDetail!.isFavorite) {
            $categoryFilter = CipherCategory.FAVORITES;
        } else {
            $categoryFilter = CipherCategory.All;
        }
    };

    const updateStatus = async (status: VaultStatus) => {
        vaultItemDetail!.status = status;

        const cipher = await encryptVaultDetailForUpdate({vaultDetail: vaultItemDetail!, sk: sk!})

        switch (status) {
            case VaultStatus.ACTIVE:
                // Check if current vault content data status is either archived or deleted.
                // If deleted, do a restore operation.
                if (vaultItemDetail!.status == VaultStatus.ARCHIVED) {
                    var response = await updateCipher(cipher);
                    await handleCipherResponse(response.data.cipher.update, sk!);
                } else {
                    var response = await restoreCipherFromDelete(cipher);
                    await handleCipherResponse(response.data.cipher.restoreCipherFromDelete, sk!);
                }
                $categoryFilter = CipherCategory.All;
                break;
            case VaultStatus.ARCHIVED:
                var response = await updateCipher(cipher);
                await handleCipherResponse(response.data.cipher.update, sk!);
                $categoryFilter = CipherCategory.ARCHIVES;
                break;
            case VaultStatus.DELETED:
                var response = await updateCipherToDelete(cipher);
                await handleCipherResponse(response.data.cipher.updateToDelete, sk!);
                $categoryFilter = CipherCategory.RECENTLY_DELETED;
            default:
                break;
        }
    }

    onMount(async () => {
        sk = await extractSymmetricKey(mk, epsk);
        vaultItemDetail = await loadVaultItemDetailFromStore($selectedVaultItem!.id, sk);
    });

</script>

<!-- Editing controls. -->
{#if vaultItemDetail}
    <div
        class:x-editing-mode={isEditMode}
        class="x-edit-panel uk-padding-small">
        {#if isEditMode}
            <div class="uk-flex">
                <div class="uk-width-expand">
                    <span class="x-edit-label uk-text-middle uk-text-bold">
                        Editing
                    </span>
                </div>
                <div>
                    <button
                        form="vault-form"
                        class="uk-button uk-button-primary uk-button-small uk-border-rounded"
                    >
                        Save
                    </button>
                    <button
                        class="uk-button uk-button-default uk-button-small uk-border-rounded"
                        onclick={
                            () => {isEditMode = !isEditMode; formErrors = [];}
                        }
                    >
                        Cancel
                    </button>
                </div>
            </div>
        {:else}
            <!--
                Favorite, Archine and Delete or Restore.
            -->
            <div class="uk-flex uk-flex-right">
                {#if vaultItemDetail.status != VaultStatus.DELETED}
                    <button
                        onclick={() => {isEditMode = !isEditMode; formErrors = [];}}
                        class:uk-margin-small-right={vaultItemDetail.status != VaultStatus.ACTIVE}
                        class="uk-button uk-button-default uk-button-small uk-border-rounded"
                    >
                    Edit
                    </button>
                {/if}

                {#if vaultItemDetail.status == VaultStatus.ACTIVE}
                    <!-- More menu -->
                    <div class="uk-inline x-vertical-center">
                        <a
                            href={null}
                            aria-label="more menu"
                            class="uk-icon-link uk-margin-small-left"
                        >
                            <Icon icon="hugeicons:more-vertical-circle-01" width="24" height="24" />
                        </a>
                        { /* @ts-ignore */ null}
                        <div uk-dropdown="mode: click">
                            <ul class="uk-nav uk-dropdown-nav">
                                <li>
                                    <a
                                        onclick={updateFavorite}
                                        href={null}
                                        class="uk-text-default"
                                        class:x-favorite={vaultItemDetail.isFavorite}
                                    >
                                        <Icon class="uk-margin-small-right" icon="hugeicons:star" width="24" height="24" />
                                        Favorite
                                    </a>
                                </li>
                                <li class="uk-nav-divider"></li>
                                <li>
                                    <a
                                        onclick={() => updateStatus(VaultStatus.ARCHIVED)}
                                        href={null}
                                        class="uk-text-default"
                                    >
                                        <Icon  class="uk-margin-small-right" icon="hugeicons:archive" width="24" height="24" />
                                        Archive
                                    </a>
                                </li>
                                <li>
                                    <a
                                        onclick={() => updateStatus(VaultStatus.DELETED)}
                                        href={null}
                                        class="uk-text-default"
                                        style="color: #D50000"
                                    >
                                        <Icon class="uk-margin-small-right" icon="hugeicons:remove-circle" width="24" height="24" />
                                        Delete
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                {:else}
                    <button
                    onclick={() => updateStatus(VaultStatus.ACTIVE)}
                        class="uk-button uk-button-default uk-button-small uk-border-rounded"
                    >
                        Restore
                    </button>
                {/if}
            </div>
        {/if}
    </div>
{/if}

<!-- Vault content display. -->
{ /* @ts-ignore */ null}
<div class="x-vault-component uk-flex uk-flex-center uk-width-expand" style="height: 93%;">
    {#key isEditMode}
        <div class="uk-width-expand uk-flex uk-flex-column uk-height-1-1">
            {#if vaultItemDetail}
                {#if vaultItemDetail.status == VaultStatus.ARCHIVED}
                    { /* @ts-ignore */ null }
                    <div class="uk-alert uk-text-bold" uk-alert>
                        <p>This vault item is archived.</p>
                    </div>
                {/if}

                {#if vaultItemDetail.status == VaultStatus.DELETED}
                    { /* @ts-ignore */ null }
                    <div class="uk-alert-danger uk-text-bold" uk-alert>
                        <p>This vault item is scheduled to be deleted.</p>
                    </div>
                {/if}
            {/if}

            <VaultComponent
                formId="vault-form"
                vaultId={$selectedVaultItem!.id}
                bind:isEditMode={isEditMode}
            />
        </div>
    {/key}
</div>


<style>

    .x-vault-component {
        padding: 0 15px;
        overflow: scroll;
    }

    .x-edit-panel {
        border-bottom: 1px solid #E0E0E0;
    }

    .x-editing-mode {
        background: #f1f1f1;
        border-bottom: 1px solid #E0E0E0;
    }

    .x-favorite, .x-favorite:hover {
        color: #FBC02D;
    }
</style>
