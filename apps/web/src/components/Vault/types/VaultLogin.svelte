<script>
    import VaultLoginDetail from "./VaultLoginDetail.svelte";
    import VaultLoginEdit from "./VaultLoginEdit.svelte";

    import { ciphers } from "$lib/mock/ciphers";
    import { onMount } from "svelte";

    let { vaultId } = $props();

    let cipher = {...ciphers.find(cipher => cipher.id == vaultId)};
    let isEdit = $state(false);
    let output = $state(null);

    let ComponentDisplay = $derived(isEdit ? VaultLoginEdit : VaultLoginDetail);

    const onEdit = (data) => {
        console.log(data);
    };

</script>

{#snippet controller(data)}
    <div class="uk-flex uk-flex-right uk-margin">
        {#if isEdit}
            <button onclick={() => {onEdit(data)}} class="uk-button uk-button-small uk-button-primary uk-border-rounded">
                Save
            </button>
        {/if}
        <button class:uk-button-primary={!isEdit} onclick={() => {isEdit = !isEdit}} class="uk-button uk-button-small uk-border-rounded uk-margin-small-left">
            {isEdit ? "Cancel" : "Edit"}
        </button>
    </div>
{/snippet}

<div class="uk-width-expand">
    {#key isEdit}
        <ComponentDisplay cipher={cipher} {controller}/>
    {/key}
</div>
