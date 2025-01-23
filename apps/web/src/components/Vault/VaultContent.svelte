<script>
    
    import { onMount } from "svelte";
    
    import IconButton from "$components/Buttons/IconButton.svelte";
    import VaultLogin from "./types/VaultLogin.svelte";
    import VaultSecureNote from "./types/VaultSecureNote.svelte";

    let { vaultData = null } = $props();

    let VaultComponent = $state(null);
    let isEditMode = $state(false);

    // Data assigned on component edit.
    let componentData = $state({});

    const VAULT_MAPPER = {
        "LOGIN": VaultLogin,
        "SECURE_NOTE": VaultSecureNote
    }

    onMount(() => {
        if (vaultData) {
            VaultComponent = VAULT_MAPPER[vaultData.type];
        }
    });

    const onSave = () => {
        console.log(componentData);
    };

</script>

{#if vaultData}
    <div class:x-editing-mode={isEditMode} class="uk-padding-small">
        {#if isEditMode}
            <div class="uk-flex">
                <div class="uk-width-expand">
                    <span class="x-edit-label uk-text-middle uk-text-bold">Editing</span>
                </div>
                <div>
                    <button onclick={() => onSave()} class="uk-button uk-button-primary uk-button-small uk-border-rounded">
                        Save
                    </button>
                    <button class="uk-button uk-button-default uk-button-small uk-border-rounded" onclick={() => {isEditMode = !isEditMode}}>
                        Cancel
                    </button>
                </div>
            </div>
        {:else}
            <div class="uk-flex uk-flex-right">
                <IconButton onclick={() => {isEditMode = !isEditMode}} icon="pencil" text="Edit"/>
            </div>
        {/if}
    </div>

    <div class="x-vault-content uk-flex uk-flex-center uk-width-expand">
        <VaultComponent vaultId={vaultData.id} editMode={isEditMode} bind:data={componentData} />
    </div>
{/if}


<style>
    .x-vault-content {
        padding: 5px 15px;
    }

    .x-editing-mode {
        background: #F5F5F5;
    }

</style>
