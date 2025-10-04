<script lang="ts">
    import Icon from "@iconify/svelte";

    import { getContext, onMount } from "svelte";
    import { fade } from "svelte/transition";

    import VaultLoginDetail from "$components/Vault/types/Login/VaultLoginDetail.svelte";
    import VaultLoginEdit from "$components/Vault/types/Login/VaultLoginEdit.svelte";
    import VaultSecureNoteEdit from "$components/Vault/types/SecureNote//VaultSecureNoteEdit.svelte";
    import VaultSecureNoteDetail from "$components/Vault/types/SecureNote/VaultSecureNoteDetail.svelte";
    import VaultCardDetail from "./types/Card/VaultCardDetail.svelte";
    import VaultCardEdit from "./types/Card/VaultCardEdit.svelte";

    import { extractSymmetricKey, generateCipherKey } from "$lib/key-generation";
    import { restoreCipherFromDelete, updateCipher, updateCipherToDelete } from "$lib/services/ciphers";
    import { categoryFilter, cipherStore, selectedVaultItem, vaultItemStore } from "$lib/stores";
    import { decryptCipherForVaultContent, decryptCipherForVaultItem, encryptCipher } from "$lib/symmetric-encryption";
    import { CipherCategory, VaultStatus, type Cipher, type CipherData, type VaultContentData } from "$lib/types";

    const epsk: string = getContext("epsk");
    const mk: string = getContext("mk");

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

    // Data assigned on component edit.
    let componentData: any = $state({});

    let editMode = $state(false);
    let formErrors: Array<string> = $state([]);
    let vaultContentData: VaultContentData | null = $state(null);

    let onSaveSubmitted = $state(false);

    let VaultComponent = $derived.by(() => {
        if (vaultContentData != null) {
            // @ts-ignore TODO: remove ts-ignore if default cipher is defined.
            let component = VAULT_MAPPER[vaultContentData.type];
            return editMode ? component.edit : component.details;
        }
    });

    const loadCipherDetail = async () => {
        if ($selectedVaultItem != null) {
            const encryptedCipher = cipherStore.get($selectedVaultItem.id)!;
            const sk = await extractSymmetricKey(mk, epsk);
            vaultContentData = await decryptCipherForVaultContent(sk, encryptedCipher);
        }
    };

    const encryptVaultContentForUpdate = async (
        {name, data, isFavorite, status}: {name?: string; data?: CipherData; isFavorite?: boolean; status?: VaultStatus}
    ): Promise<Cipher> => {
        const ck = await generateCipherKey();
        const sk = await extractSymmetricKey(mk, epsk);

        let baseCipherData = {
            sk: sk,
            ck: ck,
            id: $selectedVaultItem!.id,
            type: vaultContentData!.type,
            status: status !== undefined ? status : vaultContentData!.status,
            isFavorite: isFavorite !== undefined ? isFavorite : vaultContentData!.isFavorite,
            name: name !== undefined ? name : vaultContentData!.name,
            data: data !== undefined ? data : vaultContentData!.data,
        };
        const _cipher: Cipher = await encryptCipher({ ...baseCipherData });
        return { ..._cipher, id: $selectedVaultItem!.id } as Cipher;
    };

    const handleUpdateResponse = async (responsePayload: any) => {
        switch (responsePayload.__typename) {
            case "Cipher":
                const updatedCipher = responsePayload as Cipher;
                cipherStore.edit(updatedCipher);

                const sk = await extractSymmetricKey(mk, epsk);
                const updatedVaultItem = await decryptCipherForVaultItem(sk, updatedCipher);
                $selectedVaultItem = updatedVaultItem;
                vaultItemStore.edit(updatedVaultItem)

                loadCipherDetail();
                editMode = !editMode;
                break;
            default:
                formErrors.push(responsePayload.message);
                break;
        }
    };

    const updateFavorite = async () => {
        const cipher = await encryptVaultContentForUpdate({isFavorite: !(vaultContentData!.isFavorite)})
        const response = await updateCipher(cipher);

        await handleUpdateResponse(response.data.cipher.update);

        if (!(vaultContentData!.isFavorite)) {
            $categoryFilter = CipherCategory.FAVORITES;
        } else {
            $categoryFilter = CipherCategory.All;
        }
    };

    const updateStatus = async(status: VaultStatus) => {
        const cipher = await encryptVaultContentForUpdate({status: status});

        switch (status) {
            case VaultStatus.ACTIVE:
                // Check if current vault content data status is either archived or deleted.
                // If deleted, do a restore operation.
                if (vaultContentData?.status == VaultStatus.ARCHIVED) {
                    var response = await updateCipher(cipher);
                    await handleUpdateResponse(response.data.cipher.update);
                } else {
                    var response = await restoreCipherFromDelete(cipher);
                    await handleUpdateResponse(response.data.cipher.restoreCipherFromDelete);
                }
                $categoryFilter = CipherCategory.All;
                break;
            case VaultStatus.ARCHIVED:
                var response = await updateCipher(cipher);
                await handleUpdateResponse(response.data.cipher.update);
                $categoryFilter = CipherCategory.ARCHIVES;
                break;
            case VaultStatus.DELETED:
                var response = await updateCipherToDelete(cipher);
                await handleUpdateResponse(response.data.cipher.updateToDelete);
                $categoryFilter = CipherCategory.RECENTLY_DELETED;
            default:
                break;
        }
    }

    const onSave = async (e: any) => {
        e.preventDefault();

        onSaveSubmitted = true;

        formErrors = [];
        if (componentData.errors.length > 0) {
            formErrors = componentData.errors;
            onSaveSubmitted = false;
            return;
        }

        const cipher: Cipher = await encryptVaultContentForUpdate({name: componentData.name, data: componentData.data});
        const response = await updateCipher(cipher);
        await handleUpdateResponse(response.data.cipher.update);
        onSaveSubmitted = false;
    };

    onMount(async () => {
        await loadCipherDetail();
    });

</script>

<!-- Editing controls. -->
{#if vaultContentData}
    <div class:x-editing-mode={editMode} class="x-edit-panel uk-padding-small">
        {#if editMode}
            <div class="uk-flex">
                <div class="uk-width-expand">
                    <span class="x-edit-label uk-text-middle uk-text-bold">Editing</span>
                </div>
                <div>
                    <button disabled={onSaveSubmitted} form="vault-form" class="uk-button uk-button-primary uk-button-small uk-border-rounded">
                        Save
                    </button>
                    <button class="uk-button uk-button-default uk-button-small uk-border-rounded" onclick={() => {editMode = !editMode; formErrors = [];}}>
                        Cancel
                    </button>
                </div>
            </div>
        {:else}
            <!--
                Favorite, Archine and Delete or Restore.
            -->
            <div class="uk-flex uk-flex-right">
                {#if vaultContentData.status != VaultStatus.DELETED}
                    <button
                        onclick={() => {editMode = !editMode; formErrors = [];}}
                        class:uk-margin-small-right={vaultContentData.status != VaultStatus.ACTIVE}
                        class="uk-button uk-button-default uk-button-small uk-border-rounded"
                    >
                    Edit
                    </button>
                {/if}

                {#if vaultContentData.status == VaultStatus.ACTIVE}
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
                                        class:x-favorite={vaultContentData.isFavorite}
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
    {#key editMode}
        <form
            onsubmit={onSave}
            id="vault-form"
            class="uk-width-expand uk-flex uk-flex-column uk-height-1-1" 
            novalidate
        >
            {#if formErrors.length > 0}
                <div transition:fade={{ duration: 100 }} class="uk-padding-small uk-text-small">
                    { /* @ts-ignore */ null }
                    <div class="uk-alert-danger" uk-alert>
                        <ul>
                            {#each formErrors as error}
                                <li>{error}</li>
                            {/each}
                        </ul>
                    </div>
                </div>
            {/if}

            {#if vaultContentData}
                {#if vaultContentData.status == VaultStatus.ARCHIVED}
                    { /* @ts-ignore */ null }
                    <div class="uk-alert uk-text-bold" uk-alert>
                        <p>This vault item is archived.</p>
                    </div>
                {/if}

                {#if vaultContentData.status == VaultStatus.DELETED}
                    { /* @ts-ignore */ null }
                    <div class="uk-alert-danger uk-text-bold" uk-alert>
                        <p>This vault item is scheduled to be deleted.</p>
                    </div>
                {/if}
            {/if}

            <VaultComponent cipher={vaultContentData} bind:data={componentData} />
        </form>
    {/key}
</div>


<style>
    .x-vault-component {
        padding: 0 15px;
    }

    .x-editing-mode {
        background: #f1f1f1;
        border-bottom: 1px solid #E0E0E0;
    }

    .x-favorite, .x-favorite:hover {
        color: #FBC02D;
    }
</style>
