<script>
    
    import { onMount } from "svelte";

    import IconButton from "$components/Buttons/IconButton.svelte";

    import VaultLoginDetail from "$components/Vault/types/Login/VaultLoginDetail.svelte";
    import VaultLoginEdit from "$components/Vault/types/Login/VaultLoginEdit.svelte";

    import VaultSecureNoteDetail from "$components/Vault/types/SecureNote/VaultSecureNoteDetail.svelte";
    import VaultSecureNoteEdit from "$components/Vault/types/SecureNote//VaultSecureNoteEdit.svelte";

    import { ciphers } from "$lib/mock/ciphers";

    let { vaultId = null } = $props();

    const VAULT_MAPPER = {
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
    let cipher = $state({...ciphers.find(cipher => cipher.id == vaultId)});

    let VaultComponent = $derived.by(() => {
        let component = VAULT_MAPPER[cipher.type];
        return editMode ? component.edit : component.details;
    });

    const onSave = () => {
        console.log(componentData);
    };

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
                    <a
                        href
                        uk-icon="icon: more-vertical"
                        aria-label="more menu"
                        class="uk-icon-link uk-margin-left"
                    ></a>
                    <div uk-dropdown="mode: click">
                        <ul class="uk-nav uk-dropdown-nav">
                            <li>
                                <a href class="uk-text-default">
                                    <span uk-icon="icon: star" class="uk-margin-small-right"></span>
                                    Add to favorites
                                </a>
                            </li>
                            <li class="uk-nav-divider"></li>
                            <li>
                                <a href class="uk-text-default">
                                    <span uk-icon="icon: album" class="uk-margin-small-right"></span>
                                    Archive
                                </a>
                            </li>
                            <li>
                                <a href class="uk-text-default" style="color: #D50000">
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
