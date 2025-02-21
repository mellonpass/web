<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { writable } from 'svelte/store';

    let { cipher, data = $bindable({}) } = $props();

    let showPassword = $state(false);

    const loginData = writable({
        id: cipher.id,
        type: cipher.type,
        name: cipher.name,
        username: cipher.data.username,
        password: cipher.data.password,
    });

    // Capture loginData changes and assign to
    // component data for saving.
    const loginDataUnsubscriber = loginData.subscribe((value) => {
        data = value;

        // Inject error data.
        data.errors = []
        if (value.name == "") {
            data.errors.push("Name is required.");
        }
        if (value.username == "") {
            data.errors.push("Username is required.");
        }
        if (value.password == "") {
            data.errors.push("Password is required.");
        }
    });

    let titleInputRef: HTMLInputElement;

    onMount(() => {
        titleInputRef.focus();
        titleInputRef.select();
    });

    onDestroy(() => {
        loginDataUnsubscriber();
    });

</script>

<div class="uk-panel">
    <div class="uk-padding-small">
        { /* @ts-ignore */ null }
        <div class="uk-grid-small uk-flex-middle" uk-grid>
            <div class="uk-width-auto">
                <img class="uk-border-round" width="60" height="60" src="https://placehold.jp/150x150.png" alt="Avatar">
            </div>
            <div class="uk-width-expand">
                <!-- svelte-ignore a11y_autofocus -->
                <input
                    bind:this={titleInputRef}
                    bind:value={$loginData.name}
                    style="background: none;"
                    class="uk-input uk-form-large x-editable-input"
                    type="text"
                    aria-label="Input"
                    autofocus
                    required
                >
            </div>
        </div>
    </div>

    <div class="x-panel uk-border-rounded">
        <div class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
            <span class="x-vertical-center uk-text-muted uk-margin-right">Username: </span>
            <input
                bind:value={$loginData.username}
                class="uk-input x-editable-input"
                type="text"
                aria-label="Input"
                required
            >
        </div>
        <hr class="uk-margin-remove">
        <div class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
            <span class="x-vertical-center uk-text-muted uk-margin-right">Password: </span>
            {#if showPassword}
                <!-- svelte-ignore a11y_autofocus -->
                <input
                    bind:value={$loginData.password}
                    onfocusin={() => {showPassword = true}}
                    onfocusout={() => {showPassword = false}}
                    type="text"
                    class="uk-input x-editable-input" 
                    aria-label="Input"
                    autofocus
                    required
                >
            {:else}
                <input
                    onfocusin={() => {showPassword = true}}
                    type="text"
                    class="uk-input x-editable-input" 
                    aria-label="Input"
                    value="• • • • • • • • • •"
                    readonly
                >
            {/if}
        </div>
    </div>
</div>

<style>
    .x-panel {
        background-color: white;
        border: solid 1px whitesmoke;
    }

    .x-editable-input {
        border: none;
    }
</style>