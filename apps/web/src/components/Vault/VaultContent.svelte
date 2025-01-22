<script>
    
    import { onMount } from "svelte";
    
    import IconButton from "$components/Buttons/IconButton.svelte";
    import VaultLogin from "./types/VaultLogin.svelte";
    import VaultSecureNote from "./types/VaultSecureNote.svelte";

    let { vaultData } = $props();

    let VaultComponent = $state(null);
    let isEditMode = $state(false);

    const VAULT_MAPPER = {
        "LOGIN": VaultLogin,
        "SECURE_NOTE": VaultSecureNote
    }

    onMount(() => {
        if (vaultData) {
            VaultComponent = VAULT_MAPPER[vaultData.type];
        }
    });

    const onSave = (data) => {
        console.log(data);
    };

</script>

<div class:x-editing-mode={isEditMode} class="uk-padding-small">
    {#if isEditMode}
        <div class="uk-flex">
            <div class="uk-width-expand">
                <span class="x-edit-label uk-text-middle uk-text-bold">Editing</span>
            </div>
            <div>
                <button onclick={() => onSave(data)} class="uk-button uk-button-primary uk-button-small uk-border-rounded">
                    Save
                </button>
                <button class="uk-button uk-button-default uk-button-small uk-border-rounded" onclick={() => {isEditMode = !isEditMode}}>
                    Cancel
                </button>
            </div>
        </div>
    {:else}
        <div class="uk-flex uk-flex-right">
            <IconButton onclick={() => {isEditMode = !isEditMode}} icon="pencil"/>
        </div>
    {/if}
</div>

<div class="x-vault-content uk-flex uk-flex-center uk-width-expand">
    <VaultComponent vaultId={vaultData.id} editMode={isEditMode}/>
</div>


<style>
    .x-vault-content {
        padding: 5px 15px;
    }

    .x-editing-mode {
        background: #E1F5FE;
    }

    .x-edit-label  {
        color: #0D92F4;
    }
</style>