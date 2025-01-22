<script>
    import VaultLoginDetail from "./VaultLoginDetail.svelte";
    import VaultLoginEdit from "./VaultLoginEdit.svelte";

    import IconButton from "$components/Buttons/IconButton.svelte";
    import { ciphers } from "$lib/mock/ciphers";

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
            <button onclick={() => {onEdit(data)}} class="uk-button uk-button-small uk-button-primary">
                Save
            </button>
        {/if}
        <IconButton onclick={() => {isEdit = !isEdit}}/>
    </div>
{/snippet}

<div class="uk-width-expand">
    {#key isEdit}
        <ComponentDisplay cipher={cipher} {controller}/>
    {/key}
</div>


<style>
    .x-edit- {}
</style>