<script lang="ts">
    type FormItemDetails = {
        name: string
    }
    type FormAdditionalOptions = {
        notes: string
    };
    type FormCallBack  = (args: any) => void;

    let {
        id,
        title,
        itemDetails,
        additionalOptions,
        onSubmit,
        children
    }: {
        id: string,
        title: string,
        itemDetails: FormItemDetails,
        additionalOptions: FormAdditionalOptions,
        onSubmit: FormCallBack,
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

    <!-- Additional options -->
    <fieldset class="uk-fieldset uk-margin">
         <legend class="uk-legend uk-text-default uk-text-bold">Additional options</legend>
         <div class="uk-margin-small">
            <div class="uk-form-controls">
                <textarea
                    style="resize: none;"
                    class="uk-textarea uk-border-rounded"
                    aria-label="Textarea"
                    placeholder="Notes"
                    rows=5
                    bind:value={additionalOptions.notes}
                >
                </textarea>
            </div>
        </div>
    </fieldset>
</form>
