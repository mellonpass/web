<script lang="ts">
    
    import IconButton from "$components/Buttons/IconButton.svelte";

    import VaultLoginDetail from "$components/Vault/types/Login/VaultLoginDetail.svelte";
    import VaultLoginEdit from "$components/Vault/types/Login/VaultLoginEdit.svelte";

    import VaultSecureNoteEdit from "$components/Vault/types/SecureNote//VaultSecureNoteEdit.svelte";
    import VaultSecureNoteDetail from "$components/Vault/types/SecureNote/VaultSecureNoteDetail.svelte";
    import { extractSymmetricKey } from "$lib/key-generation";
    import { getCipherById } from "$lib/services/ciphers";
    import { decryptCipher } from "$lib/symmetric-encryption";

    import type { Cipher } from "$lib/types";
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
    let componentData = $state({});

    let editMode = $state(false);
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
            const rawCipher = await getCipherById(vaultId);
            const sk = await extractSymmetricKey(mk, epsk);
            cipher = await decryptCipher(sk, rawCipher);
        }
    };

    const onSave = () => {
        console.log(componentData);
    };
    
    onMount(async () => {
        await loadCipherDetail();
    });

</script>

{#if vaultId}
    <div class:x-editing-mode={editMode} class="uk-padding-small">
        {#if editMode}
            <div class="uk-flex">
                <div class="uk-width-expand">
                    <span class="x-edit-label uk-text-middle uk-text-bold">Editing</span>
                </div>
                <div>
                    <button onclick={() => onSave()} class="uk-button uk-button-primary uk-button-small uk-border-rounded">
                        Save
                    </button>
                    <button class="uk-button uk-button-default uk-button-small uk-border-rounded" onclick={() => {editMode = !editMode}}>
                        Cancel
                    </button>
                </div>
            </div>
        {:else}
            <div class="uk-flex uk-flex-right">
                <IconButton onclick={() => {editMode = !editMode}} icon="pencil" text="Edit"/>
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

    <div class="x-vault-component uk-flex uk-flex-center uk-width-expand">
        <div class="uk-width-expand">
            {#key editMode}
                <VaultComponent {cipher} bind:data={componentData} />
            {/key}
        </div>
    </div>
{/if}


<style>
    .x-vault-component {
        padding: 5px 15px;
    }

    .x-editing-mode {
        background: #f1f1f1;
        border-bottom: 1px solid #E0E0E0;
    }

</style>
