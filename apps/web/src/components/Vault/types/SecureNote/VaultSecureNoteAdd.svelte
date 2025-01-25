
<div class="uk-modal-body">
    <form class="uk-form-stacked">
        <div class="uk-margin">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                value="Secure Note"
                type="text"
                aria-label="Item title"
                class="uk-input uk-form-large uk-border-rounded"
                autofocus
            >
        </div>

        <div class="uk-margin">
            <div class="uk-form-controls">
                <textarea style="resize: none;" class="uk-textarea uk-border-rounded" aria-label="Textarea"></textarea>
            </div>
        </div>
    </form>
</div>

<div class="uk-modal-footer uk-flex uk-flex-row-reverse">
    <div class="uk-margin">
        <button class="uk-button uk-button-primary uk-border-rounded">Save</button>
        <button onclick={() => {UIkit.modal("#vault-modal").hide()}}  class="uk-button uk-button-default uk-border-rounded">Cancel</button>
    </div>
</div>
