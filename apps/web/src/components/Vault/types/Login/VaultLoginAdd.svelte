<script>
    let passwordToggle = $state(false);
</script>

<div class="uk-modal-body">
    <form class="uk-form-stacked">
        <div class="uk-margin">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                value="Login"
                type="text"
                aria-label="Item title"
                class="uk-input uk-form-large uk-border-rounded"
                autofocus
            >
        </div>

        <div class="uk-margin">
            <label class="uk-form-label" for="form-stacked-text">Username</label>
            <div class="uk-form-controls">
                <input class="uk-input uk-border-rounded" type="text">
            </div>
        </div>
        <div class="uk-margin">
            <label class="uk-form-label" for="form-stacked-select">Password</label>
            <div class="uk-form-controls">
                <div class="uk-inline uk-width-100">
                    <input class="uk-input uk-border-rounded" type="{passwordToggle ? 'text' : 'password'}">
                    <a
                        aria-label="eye-icon"
                        class="uk-form-icon uk-form-icon-flip"
                        href
                        uk-icon="icon: {passwordToggle ? 'eye-slash' : 'eye'}"
                        onclick={() => {passwordToggle = !passwordToggle}}
                    >
                    </a>
                </div>
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
