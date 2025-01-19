<script>
    import VaultLoginContent from "./VaultLoginContent.svelte";
    import VaultLoginEdit from "./VaultLoginEdit.svelte";
    import { onMount } from "svelte";

    let {data = $bindable()} = $props();

    let isEdit = $state(false);
</script>

<div class="uk-width-expand">
    <div class="uk-flex uk-flex-right uk-margin">
        {#if isEdit}
            <button class="uk-button uk-button-small uk-button-primary uk-border-rounded">
                Save
            </button>
        {/if}
        <button class:uk-button-primary={!isEdit} onclick={() => {isEdit = !isEdit}} class="uk-button uk-button-small uk-border-rounded uk-margin-small-left">
            {isEdit ? "Cancel" : "Edit"}
        </button>
    </div>

    {#key isEdit}
        {#if isEdit}
            <VaultLoginEdit bind:data />
        {:else}
            <VaultLoginContent bind:data/>
        {/if}
    {/key}
</div>
