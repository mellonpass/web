<script>
    import { onMount } from "svelte";

    let { cipher, controller } = $props();

    let showPassword = $state(false);
    let data = $state({
        // Encrypt from cipher to data.
        id: cipher.id,
        title: cipher.title,
        username: cipher.data.username,
        password: cipher.data.password,
    });

    let titleInputRef = null

    onMount(() => {
        titleInputRef.focus();
        titleInputRef.select();
    });

</script>

<div class="uk-flex uk-flex-right uk-margin">
    {@render controller(data)}
</div>

<div class="uk-padding-small">
    <div class="uk-grid-small uk-flex-middle" uk-grid>
        <div class="uk-width-auto">
            <img class="uk-border-round" width="60" height="60" src="https://placehold.jp/150x150.png" alt="Avatar">
        </div>
        <div class="uk-width-expand">
            <!-- svelte-ignore a11y_autofocus -->
            <input
                bind:this={titleInputRef}
                bind:value={data.title}
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
        <span class="x-vertical-center uk-text-muted uk-margin-right">Username: </span>
        <input
            bind:value={data.username}
            class="uk-input x-editable-input"
            type="text"
            aria-label="Input"
        >
    </div>
    <hr class="uk-margin-remove">
    <div href class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
        <span class="x-vertical-center uk-text-muted uk-margin-right">Password: </span>
        {#if showPassword}
            <!-- svelte-ignore a11y_autofocus -->
            <input
                bind:value={data.password}
                onfocusin={() => {showPassword = true}}
                onfocusout={() => {showPassword = false}}
                type="text"
                class="uk-input x-editable-input" 
                aria-label="Input"
                autofocus
            >
        {:else}
            <input
                onfocusin={() => {showPassword = true}}
                type="text"
                class="uk-input x-editable-input" 
                aria-label="Input"
                value="• • • • • • • • • •"
            >
        {/if}
    </div>
</div>


<style>
    .x-login-panel {
        background-color: white;
        border: solid 1px whitesmoke;
    }

    .x-vertical-center {
        display: inline-flex;
        align-items: center;
    }

    .x-editable-input {
        border: none;
    }
</style>