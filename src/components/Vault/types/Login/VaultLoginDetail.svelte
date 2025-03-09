<script lang="ts">
    import { fade } from 'svelte/transition';

    import vaultImage from "$lib/assets/images/vaultImage.png";

    let { cipher } = $props();
    let copied = $state(false);

    const onCopy = (data: string) => {
        navigator.clipboard.writeText(data).then(() => {
            copied = true;
            setTimeout(() => {
                copied = false;
            }, 3000);
        });
    };

</script>


<div class="uk-flex uk-flex-column uk-flex-between uk-height-1-1">
    <div class="uk-panel x-panel-container">
        <div class="uk-padding-small">
            { /* @ts-ignore */ null }
            <div class="uk-grid-small uk-flex-middle" uk-grid>
                <div class="uk-width-auto">
                    <img class="uk-border-round" width="60" height="60" src={vaultImage} alt="Avatar">
                </div>
                <div class="uk-width-expand">
                    <h3 class="uk-card-title uk-margin-remove-bottom">{cipher.name}</h3>
                </div>
            </div>
        </div>
        <div class="x-panel uk-border-rounded">
            <a onclick={(e) => {onCopy(cipher.data.username)}} href={null} class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
                <span class="uk-text-muted uk-margin-right">Username: </span>
                <span class="uk-text-emphasis uk-text-baseline uk-width-expand">{cipher.data.username}</span>
                <span class="x-copy-label uk-text-right uk-text-decoration-none">COPY</span>
            </a>
            <hr class="uk-margin-remove">
            <a onclick={(e) => {onCopy(cipher.data.password)}} href={null} class="x-login-item uk-padding-small uk-flex uk-text-decoration-none">
                <span class="uk-text-muted uk-margin-right">Password: </span>
                <span class="uk-text-emphasis uk-text-baseline uk-width-expand">• • • • • • • • • •</span>
                <span class="x-copy-label uk-text-right uk-text-decoration-none">COPY</span>
            </a>
        </div>
    </div>

    {#if copied}
        <div in:fade={{ duration: 50 }} class="x-copy-info uk-margin">
            Copied to clipboard.
        </div>
    {/if}
</div>

<style>
    .x-panel {
        background-color: white;
        border: solid 1px whitesmoke;
    }

    .x-login-item:hover {
        cursor: pointer;
        font-weight: 500;
        background: #eff4fd;
    }

    .x-copy-label {
        color: black;
        visibility: hidden;
    }

    .x-login-item:hover .x-copy-label {
        visibility: visible;
    }

    .x-copy-info {
        color: white;
        background: #585858;
        font-size: small;
        font-weight: 500;
        padding: 10px;
        border-radius: 5px;
    }

</style>
