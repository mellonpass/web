<script lang="ts">
    import VaultLoginDetail from "$components/Vault/types/Login/VaultLoginDetail.svelte";
    import VaultLoginEdit from "$components/Vault/types/Login/VaultLoginEdit.svelte";

    import VaultSecureNoteEdit from "$components/Vault/types/SecureNote//VaultSecureNoteEdit.svelte";
    import VaultSecureNoteDetail from "$components/Vault/types/SecureNote/VaultSecureNoteDetail.svelte";
    import { extractSymmetricKey, generateCipherKey } from "$lib/key-generation";
    import { cipherStore } from "$lib/stores";
    import { decryptCipher, encryptCipher } from "$lib/symmetric-encryption";

    import { CipherType, type Cipher } from "$lib/types";
    import { getContext, onMount } from "svelte";

    let { vaultId = null } = $props();

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
        }
    };

    // Data assigned on component edit.
    let componentData: any = $state({});

    let editMode = $state(false);
    let formErrors = $state([]);
    let cipher: Cipher | null = $state(null);

    let VaultComponent = $derived.by(() => {
        if (cipher != null) {
            // @ts-ignore TODO: remove ts-ignore if default cipher is defined.
            let component = VAULT_MAPPER[cipher.type];
            return editMode ? component.edit : component.details;
        }
    });

    const loadCipherDetail = async () => {
        if (vaultId != null) {
            const rawCipher = cipherStore.get(vaultId)!;
            const sk = await extractSymmetricKey(mk, epsk);
            cipher = await decryptCipher(sk, rawCipher);
        }
    };

    const onSave = async (e: any) => {
        e.preventDefault();

        formErrors = [];
        if (componentData.errors.length > 0) {
            formErrors = componentData.errors;
            return;
        }

        const ck = await generateCipherKey();
        const sk = await extractSymmetricKey(mk, epsk);
        let cipher = null;

        switch (componentData.type) {
            case CipherType.LOGIN:
                cipher = await encryptCipher({
                    sk: sk,
                    ck: ck,
                    name: componentData.name,
                    type: CipherType.LOGIN,
                    data: {
                        username: componentData.username,
                        password: componentData.password
                    }
                });
                break;
            case CipherType.SECURE_NOTE:
                cipher = await encryptCipher({
                    sk: sk,
                    ck: ck,
                    name: componentData.name,
                    type: CipherType.LOGIN,
                    data: {
                        note: componentData.note,
                    }
                });
                break;
        }

        console.log(cipher);
    };

    onMount(async () => {
        await loadCipherDetail();
    });

</script>

{#if cipher}
    <div class:x-editing-mode={editMode} class="x-edit-panel uk-padding-small">
        {#if editMode}
            <div class="uk-flex">
                <div class="uk-width-expand">
                    <span class="x-edit-label uk-text-middle uk-text-bold">Editing</span>
                </div>
                <div>
                    <button form="vault-form" class="uk-button uk-button-primary uk-button-small uk-border-rounded">
                        Save
                    </button>
                    <button class="uk-button uk-button-default uk-button-small uk-border-rounded" onclick={() => {editMode = !editMode}}>
                        Cancel
                    </button>
                </div>
            </div>
        {:else}
            <div class="uk-flex uk-flex-right">
                <button onclick={() => {editMode = !editMode}} class="uk-button uk-button-default uk-button-small uk-border-rounded">
                   Edit
                </button>
                <div class="uk-inline x-vertical-center">
                    { /* @ts-ignore */ null}
                    <a
                        href={null}
                        uk-icon="icon: more-vertical"
                        aria-label="more menu"
                        class="uk-icon-link uk-margin-left"
                    ></a>
                    { /* @ts-ignore */ null}
                    <div uk-dropdown="mode: click">
                        <ul class="uk-nav uk-dropdown-nav">
                            <li>
                                <a href={null} class="uk-text-default">
                                    { /* @ts-ignore */ null}
                                    <span uk-icon="icon: star" class="uk-margin-small-right"></span>
                                    Add to favorites
                                </a>
                            </li>
                            <li class="uk-nav-divider"></li>
                            <li>
                                <a href={null} class="uk-text-default">
                                    { /* @ts-ignore */ null}
                                    <span uk-icon="icon: album" class="uk-margin-small-right"></span>
                                    Archive
                                </a>
                            </li>
                            <li>
                                <a href={null} class="uk-text-default" style="color: #D50000">
                                    { /* @ts-ignore */ null}
                                    <span uk-icon="icon: minus-circle" class="uk-margin-small-right"></span>
                                    Delete
                                </a>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        {/if}
    </div>
{/if}

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
                <div class="uk-padding-small uk-text-small">
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
            <VaultComponent {cipher} bind:data={componentData} />
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

</style>
