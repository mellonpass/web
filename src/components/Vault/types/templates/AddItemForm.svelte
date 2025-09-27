<script lang="ts">
  import { error } from "@sveltejs/kit";
  import { onMount } from "svelte";

    type FormItemDetails = {
        name: string
    }
    type FormCallBack  = (args: any) => void;

    let nameRef: HTMLInputElement | null = $state(null);

    let {
        id,
        title,
        itemDetails,
        onSubmit,
        errors,
        children
    }: {
        id: string,
        title: string,
        itemDetails: FormItemDetails,
        onSubmit: FormCallBack,
        errors: Array<string>,
        children: any
    } = $props();

    let invalidInput = $state(false);

    const handleInput = (e: any) => {
        const el = e.target;
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

<form id="{id}" onsubmit={onSubmit} class="uk-form-stacked">
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
    { /* @ts-ignore */ null }
     <fieldset class="uk-fieldset uk-margin" uk-grid>
        <legend class="uk-legend uk-text-default uk-text-bold">{ title }</legend>
        {@render children()}
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
