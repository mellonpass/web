<script lang="ts">
    import { onMount } from "svelte";
    import { writable } from 'svelte/store';

    let { cipher, data = $bindable({}) } = $props();

    let showPassword = $state(false);

    const initData = writable({
        // Encrypt from cipher to initData.
        id: cipher.id,
        title: cipher.name,
        username: cipher.data.username,
        password: cipher.data.password,
    });

    // Capture initData changes and assign to
    // component data for saving.
    initData.subscribe((value) => {
        data = value;
    });

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
                bind:value={$initData.name}
                style="background: none;"
                class="uk-input uk-form-large x-editable-input"
                type="text"
                aria-label="Input"
                autofocus
            >
        </div>
    </div>
</div>

<div class="x-panel uk-border-rounded">
    <div href class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
        <span class="x-vertical-center uk-text-muted uk-margin-right">Username: </span>
        <input
            bind:value={$initData.username}
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
                bind:value={$initData.password}
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
    .x-panel {
        background-color: white;
        border: solid 1px whitesmoke;
    }

    .x-editable-input {
        border: none;
    }
</style>