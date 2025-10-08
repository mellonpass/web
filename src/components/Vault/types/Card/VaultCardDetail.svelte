<script lang="ts">
    import vaultImage from "$lib/assets/images/vaultImage.png";
    import { VaultCardDetailComponentData } from "$lib/models/data";

    let { cipher } = $props();
    const data = new VaultCardDetailComponentData(cipher.data);
    const fields = data.getFields();
    const hasFields = fields.length > 0;

</script>

<div class="uk-panel">
    <div class="uk-padding-small">
        { /* @ts-ignore */ null}
        <div class="uk-grid-small uk-flex-middle" uk-grid>
            <div class="uk-width-auto">
                <img class="uk-border-round" width="60" height="60" src={vaultImage} alt="Avatar">
            </div>
            <div class="uk-width-expand">
                <h3 class="uk-card-title uk-margin-remove-bottom">{cipher.name}</h3>
            </div>
        </div>
    </div>

    <div class="uk-padding-small">
        <div class="uk-margin-small uk-margin-xsmall-left uk-text-small uk-text-bold">{cipher.data.brand || "Card"} details</div>
        <div class="x-panel uk-width-1-1 uk-padding-small">
            {#if hasFields}
                {#each fields as field, i}
                    {#if field.value && !field.metadata?.hidden}
                        <div class="uk-margin" class:uk-margin-remove-bottom={i === fields.length - 1 || i === 0}>
                            <div class="uk-text-meta">{field.label}</div>
                            <div>{field.value}</div>
                            <hr class="uk-margin-remove">
                        </div>
                    {/if}
                {/each}
            {:else}
                No details.
            {/if}
        </div>
    </div>
</div>

<style>
    .x-panel {
        background-color: white;
        border: solid 1px whitesmoke;
        border-radius: 10px;
    }
</style>