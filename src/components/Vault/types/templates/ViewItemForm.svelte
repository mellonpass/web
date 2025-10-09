<script lang="ts">

    import Icon from "@iconify/svelte";

    import vaultImage from "$lib/assets/images/vaultImage.png";

    let { name, detailTitle, fields } = $props();
    const hasFields = fields.length > 0;

</script>

<div class="uk-panel">
    <div class="uk-padding-small">
        <div class="x-panel uk-padding-small">
             { /* @ts-ignore */ null}
            <div class="uk-grid-small uk-flex-middle" uk-grid>
                <div class="uk-width-auto">
                    <img class="uk-border-round" width="60" height="60" src={vaultImage} alt="Avatar">
                </div>
                <div class="uk-width-expand">
                    <h3 class="uk-card-title uk-margin-remove-bottom">{name}</h3>
                </div>
            </div>
        </div>
    </div>

    <div class="uk-padding-small">
        <div class="uk-margin-small uk-margin-xsmall-left uk-text-small uk-text-bold">
            {detailTitle}
        </div>
        <div class="x-panel uk-width-1-1 uk-padding-small">
            {#if hasFields}
                {#each fields as field, i}
                    {#if field.value && !field.hidden}
                        <div class="uk-margin" class:uk-margin-remove-bottom={i === fields.length - 1 || i === 0}>
                            <div class="uk-text-meta">{field.label}</div>
                            <div class="uk-flex uk-flex-between uk-flex-middle">
                                <span>{field.displayValue?.()}</span>
                                {#if field.copy}
                                    { /* @ts-ignore */ null }
                                    <a 
                                        href={null}
                                        aria-label="copy-icon"
                                        class="uk-icon-link uk-padding-xsmall"
                                        uk-tooltip="title: Copy; pos: left"
                                        onclick={field.copyEvent}
                                    >
                                        <Icon icon="hugeicons:copy-01" width="16" height="16" />
                                    </a>
                                {/if}
                            </div>
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