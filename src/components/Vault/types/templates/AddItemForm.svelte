<script lang="ts">
    let { title, children } = $props();
</script>

<form class="uk-form-stacked">
    <!-- Item details -->
    <fieldset class="uk-fieldset uk-margin">
         <legend class="uk-legend uk-text-default uk-text-bold">Item details</legend>
         <div class="uk-margin-small">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                type="text"
                aria-label="Item title"
                class="uk-input uk-border-rounded"
                placeholder="Item name"
                required
                autofocus
            >
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
                    rows=10
                    style="resize: none;"
                    class="uk-textarea uk-border-rounded"
                    aria-label="Textarea"
                    required></textarea>
            </div>
        </div>
    </fieldset>
</form>
