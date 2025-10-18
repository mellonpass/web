<script lang="ts">
    import type { FormCallBack, FormItemDetails } from "$lib/types";

    import { onMount } from "svelte";

    let nameRef: HTMLInputElement | null = $state(null);

    let {
        id,
        title,
        itemDetails,
        onsubmit,
        errors,
        children = null
    }: {
        id: string,
        title: string,
        itemDetails: FormItemDetails,
        onsubmit: FormCallBack,
        errors: Array<string>,
        children?: any,
    } = $props();

    let invalidInput = $state(false);

    const handleInput = (e: any) => {
        invalidInput = false;
    };

    const handleInvalid = (e: any) => {
        e.preventDefault();
        invalidInput = true;
        e.target.focus();
    };

    onMount(() => {
        if (nameRef) {
            nameRef.select();
        }
    });

</script>

<form id="{id}" {onsubmit} class="uk-form-stacked">
    <!-- Item details -->
    <fieldset class="uk-fieldset uk-margin">
         <legend class="uk-legend uk-text-default uk-text-bold">Item details</legend>
         <div class="uk-margin-small">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="text"
                aria-label="Item title"
                class="uk-input uk-border-rounded {invalidInput ? 'uk-form-danger' : ''}"
                placeholder="Item name"
                bind:this={nameRef}
                bind:value={itemDetails.name}
                oninput={handleInput}
                oninvalid={handleInvalid}
                required
                autofocus
            >
            {#if invalidInput}
                <div class="uk-margin-small uk-text-meta uk-text-danger">
                    This field is required.
                </div>
            {/if}
        </div>
    </fieldset>

    <!-- Custom fieldset -->
     {#if children}
        { /* @ts-ignore */ null }
        <fieldset class="uk-fieldset uk-margin" uk-grid>
            <legend class="uk-legend uk-text-default uk-text-bold">{ title }</legend>
            {@render children()}
        </fieldset>
     {/if}

    { /* @ts-ignore */ null }
     <fieldset class="uk-fieldset uk-margin">
        <legend class="uk-legend uk-text-default uk-text-bold">Additional options</legend>

        <div class="uk-margin-small">
            <div class="uk-form-controls">
                <textarea
                    class="uk-textarea uk-border-rounded"
                    rows="5"
                    placeholder="Notes"
                    aria-label="notes"
                    bind:value={itemDetails.notes}
                ></textarea>
            </div>
        </div>
     </fieldset>

    {#if errors  }
        {#each errors as error}
            {/* @ts-ignore */ null}
            <div class="uk-alert-danger" uk-alert>
                <p>Error: {error}</p>
            </div>
        {/each}
    {/if}
</form>
