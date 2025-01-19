<script>
    import { onMount } from "svelte";

    let { cipher } = $props();

    let showPassword = $state(false);
    let titleInputRef = null

    onMount(() => {
        titleInputRef.focus();
        titleInputRef.select();
    });

</script>

<div class="uk-padding-small">
    <div class="uk-grid-small uk-flex-middle" uk-grid>
        <div class="uk-width-auto">
            <img class="uk-border-round" width="60" height="60" src="https://placehold.jp/150x150.png" alt="Avatar">
        </div>
        <div class="uk-width-expand">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                bind:this={titleInputRef}
                bind:value={cipher.title}
                style="background: none;"
                class="uk-input uk-form-large x-editable-input"
                type="text"
                aria-label="Input"
                autofocus
            >
        </div>
    </div>
</div>

<div class="x-login-panel uk-border-rounded">
    <div href class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
        <span class="x-input-label uk-text-muted uk-margin-right">Username: </span>
        <input
            bind:value={cipher.data.username}
            class="uk-input uk-form-small x-editable-input"
            type="text"
            aria-label="Input">
    </div>
    <hr class="uk-margin-remove">
    <div href class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
        <span class="x-input-label uk-text-muted uk-margin-right">Password: </span>
        <input
            bind:value={cipher.data.password}
            onfocusin={() => {showPassword = true}}
            onfocusout={() => {showPassword = false}}
            type={showPassword ? "text" : "password"}
            class="uk-input uk-form-small x-editable-input" 
            aria-label="Input"
        >
    </div>
</div>


<style>
    .x-login-panel {
        background-color: white;
        border: solid 1px whitesmoke;
    }

    .x-input-label {
        display: inline-flex;
        align-items: center;
    }

    .x-editable-input {
        border: none;
    }
</style>