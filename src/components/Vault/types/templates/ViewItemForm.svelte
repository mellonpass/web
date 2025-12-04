<script lang="ts">
    import UIkit from "uikit";

    import Icon from "@iconify/svelte";

    import ViewItemFormField from "$components/Vault/types/templates/ViewItemFormField.svelte";

    import vaultImage from "$lib/assets/images/vaultImage.png";

    import type { VaultDetailField } from "$lib/models/data";
    import type { FormItemDetails, FormItemHistory } from "$lib/types";

    let { 
        itemDetails,
        detailTitle,
        itemHistory,
        fields
     }: {
        itemDetails: FormItemDetails,
        itemHistory: FormItemHistory,
        detailTitle?: string,
        fields?: Array<VaultDetailField>
    } = $props();

    // Determine whether there are fields to show.
    const hasFields = fields ? fields.length > 0 : 0;

    // For history panel.
    const historyLastUpdated = `${itemHistory.lastEdited.toLocaleDateString()} ${itemHistory.lastEdited.toLocaleTimeString()}`;
    const historyCreated = `${itemHistory.created.toLocaleDateString()} ${itemHistory.created.toLocaleTimeString()}`;

    // Copy notes to clipboard.
    const copyNotes = (e: any) => {
        e.preventDefault();

        navigator.clipboard.writeText(itemDetails.notes!);

        setTimeout(() => {
        navigator.clipboard.writeText("");
        }, 1000 * 30);

        UIkit.notification({
            message: "<div class='uk-alert-success uk-text-default uk-padding-small'>Notes copied!<div>",
            pos: "top-right",
            timeout: 5000
        });
    };
</script>

<div class="uk-panel">

    <!-- Header: title, group, folders. -->
    <div class="uk-padding-small">
        <div class="x-panel uk-padding-small">
             { /* @ts-ignore */ null}
            <div class="uk-grid-small uk-flex-middle" uk-grid>
                <div class="uk-width-auto">
                    <img class="uk-border-round" width="60" height="60" src={vaultImage} alt="Avatar">
                </div>
                <div class="uk-width-expand">
                    <h3 class="uk-card-title uk-margin-remove-bottom">{itemDetails.name}</h3>
                </div>
            </div>
        </div>
    </div>

    <!-- Body: dynamic field contents. -->
    {#if detailTitle}
        <div class="uk-padding-small">
            <div class="uk-margin-small uk-margin-xsmall-left uk-text-small uk-text-bold">
                {detailTitle}
            </div>
            <div class="x-panel uk-width-1-1 uk-padding-small">
                {#if fields && hasFields}
                    {#each fields as field, i}
                        {#if field.value && !field.hidden}
                            <div class="uk-margin" class:uk-margin-remove-bottom={i === fields.length - 1 || i === 0}>
                                <ViewItemFormField field={field} />
                            </div>
                        {/if}
                    {/each}
                {:else}
                    No details.
                {/if}
            </div>
        </div>
    {/if}

    <!-- Additional options: notes, master password prompt, metadata fields. -->
    {#if itemDetails.notes != ""}
        <div class="uk-padding-small">
            <div class="uk-margin-small uk-margin-xsmall-left uk-text-small uk-text-bold">
                Additional options
            </div>
            <div class="x-panel uk-width-1-1 uk-padding-small">
                <div class="uk-flex uk-flex-between uk-flex-middle">
                    <div class="x-html-render uk-border-rounded">
                        {@html itemDetails.notes}
                    </div>
                    { /* @ts-ignore */ null }
                    <a 
                        href={null}
                        aria-label="copy-icon"
                        class="uk-icon-button form-field-icon-button"
                        uk-tooltip="title: Copy"
                        onclick={copyNotes}
                    >
                        <Icon icon="hugeicons:copy-01" width="16" height="16" />
                    </a>
                </div>
            </div>
        </div>
    {/if}

    <!-- History panel: created, last edited. -->
    <div class="uk-padding-small">
        <div class="uk-margin-small uk-margin-xsmall-left uk-text-small uk-text-bold">
            Item history
        </div>
        <div class="x-panel uk-width-1-1 uk-padding-small">
            <div>
                <span class="uk-text-emphasis uk-text-small">Last edited:</span>
                <span class="uk-text-meta">{historyLastUpdated}</span>
            </div>
            <div>
                <span class="uk-text-emphasis uk-text-small">Created: </span>
                <span class="uk-text-meta">{historyCreated}</span>
            </div>
        </div>
    </div>

</div>

<style>
    .x-panel {
        background-color: white;
        border: solid 1px whitesmoke;
        border-radius: 10px;
    }

    .x-html-render {
        white-space: pre;
    }

</style>