<script lang="ts">

    let { id, title, data, onsubmit, children } = $props();

    let nameRef: HTMLInputElement | null = $state(null);
    let invalidInput = $state(false);

    const handleInput = (e: any) => {
        invalidInput = false;
    };

    const handleInvalid = (e: any) => {
        e.preventDefault();
        invalidInput = true;
        e.target.focus();
    };

</script>

<div class="uk-panel">
    <div class="uk-padding-small">
        <div class="uk-width-1-1 uk-padding-small">
            <form id={id} onsubmit={onsubmit} class="uk-form-stacked">
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
                            bind:value={data.name}
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

            </form>
        </div>
    </div>
</div>
